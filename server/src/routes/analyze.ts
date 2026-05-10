import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "../db";
import {
  AnalyzeBodySchema,
  buildAnalyzePipelineContext,
  isOpenAiTimeoutError,
  runOpenAIAnalyzeAndPersist,
  tryGetCachedAnalyzeResponse,
} from "../services/analyzePipeline";

const router = Router();

async function processAnalyzeJob(jobId: string): Promise<void> {
  const db = await getDb();
  let payloadStr: string | undefined;
  try {
    const jobRow = await db.execute({
      sql: "SELECT payload FROM analyze_jobs WHERE id = ?",
      args: [jobId],
    });
    payloadStr = jobRow.rows[0]?.payload as string | undefined;
    if (!payloadStr) return;

    const body = AnalyzeBodySchema.parse(JSON.parse(payloadStr));
    const now = Math.floor(Date.now() / 1000);
    await db.execute({
      sql: "UPDATE analyze_jobs SET status = 'running', updated_at = ? WHERE id = ?",
      args: [now, jobId],
    });

    const ctx = buildAnalyzePipelineContext(body);
    const cached = await tryGetCachedAnalyzeResponse(
      db,
      ctx.inputHash,
      body.force,
    );
    if (cached) {
      await db.execute({
        sql: "UPDATE analyze_jobs SET status = 'completed', report_id = ?, updated_at = ? WHERE id = ?",
        args: [cached.id, Math.floor(Date.now() / 1000), jobId],
      });
      return;
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const result = await runOpenAIAnalyzeAndPersist(db, ctx, apiKey);
    await db.execute({
      sql: "UPDATE analyze_jobs SET status = 'completed', report_id = ?, updated_at = ? WHERE id = ?",
      args: [result.id, Math.floor(Date.now() / 1000), jobId],
    });
  } catch (err) {
    console.error(`[analyze] job ${jobId} failed:`, err);
    const msg = isOpenAiTimeoutError(err)
      ? "The AI request timed out. Try a smaller analysis scope, or raise OPENAI_TIMEOUT_MS on the server."
      : err instanceof Error
        ? err.message
        : typeof err === "string"
          ? err
          : "Analysis failed";
    const safe = msg.slice(0, 2000);
    try {
      await db.execute({
        sql: "UPDATE analyze_jobs SET status = 'failed', error = ?, updated_at = ? WHERE id = ?",
        args: [safe, Math.floor(Date.now() / 1000), jobId],
      });
    } catch (updateErr) {
      console.error("[analyze] failed to mark job failed:", updateErr);
    }
  }
}

router.post("/", async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "OPENAI_API_KEY not configured" });
    return;
  }

  const parsed = AnalyzeBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  const body = parsed.data;

  try {
    const db = await getDb();
    const ctx = buildAnalyzePipelineContext(body);
    const cached = await tryGetCachedAnalyzeResponse(
      db,
      ctx.inputHash,
      body.force,
    );
    if (cached) {
      res.json(cached);
      return;
    }

    const jobId = uuidv4();
    const now = Math.floor(Date.now() / 1000);
    await db.execute({
      sql: "INSERT INTO analyze_jobs (id, status, input_hash, payload, created_at, updated_at) VALUES (?, 'queued', ?, ?, ?, ?)",
      args: [jobId, ctx.inputHash, JSON.stringify(body), now, now],
    });

    res.status(202).json({ jobId, status: "queued" as const });
    void processAnalyzeJob(jobId);
  } catch (err) {
    console.error("[analyze] enqueue error:", err);
    res.status(500).json({ error: "Analysis failed" });
  }
});

router.get("/jobs/:jobId", async (req, res) => {
  const db = await getDb();
  const result = await db.execute({
    sql: `SELECT j.status AS jstatus, j.error AS jerror, j.report_id AS jreport_id,
                 r.id AS rid, r.created_at AS rcreated_at, r.shot_count AS rshot_count,
                 r.timeframe AS rtimeframe, r.filename AS rfilename, r.analysis AS ranalysis
          FROM analyze_jobs j
          LEFT JOIN reports r ON r.id = j.report_id
          WHERE j.id = ?`,
    args: [req.params.jobId],
  });
  const row = result.rows[0];
  if (!row) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  const status = row.jstatus as string;
  if (status === "completed" && row.rid) {
    res.json({
      status: "completed" as const,
      report: {
        id: row.rid as string,
        createdAt: new Date(
          (row.rcreated_at as number) * 1000,
        ).toISOString(),
        shotCount: row.rshot_count as number,
        timeframe: row.rtimeframe as string,
        filename: row.rfilename as string,
        analysis: JSON.parse(row.ranalysis as string),
        cached: false,
      },
    });
    return;
  }

  if (status === "failed") {
    res.json({
      status: "failed" as const,
      error: (row.jerror as string) || "Analysis failed",
    });
    return;
  }

  res.json({
    status: status === "queued" ? ("queued" as const) : ("running" as const),
  });
});

export default router;
