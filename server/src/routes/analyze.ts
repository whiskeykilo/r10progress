import { createHash } from "crypto";
import { Router } from "express";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { getDb } from "../db";
import { SYSTEM_PROMPT } from "../prompts/system";
import { AIAnalysisResultSchema, PROMPT_VERSION } from "../schema/aiReport";
import { aggregateShots } from "../utils/aggregate";

const router = Router();

const BodySchema = z.object({
  shots: z.array(z.record(z.unknown())),
  timeframe: z.string(),
  filename: z.string(),
  force: z.boolean().optional(),
  sessionNotes: z
    .array(
      z.object({
        filename: z.string(),
        notes: z.string(),
      }),
    )
    .optional(),
});

// Reasoning-capable analytical task with strict structured output. gpt-5-mini
// gives us real reasoning at mid-tier cost; reasoning_effort "low" caps
// reasoning-token spend while preserving the quality lift over gpt-4o-mini.
const MODEL = "gpt-5-mini";
const REASONING_EFFORT = "low" as const;

// Headroom for reasoning tokens + structured output. Reasoning tokens count
// against this limit; if responses come back truncated, raise this first.
const MAX_COMPLETION_TOKENS = 6000;

router.post("/", async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "OPENAI_API_KEY not configured" });
    return;
  }

  const body = BodySchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  const {
    shots,
    timeframe,
    filename,
    force,
    sessionNotes: rawSessionNotes,
  } = body.data;

  const sessionNotes = (rawSessionNotes ?? [])
    .map(({ filename: fn, notes }) => ({
      filename: fn.trim(),
      notes: notes.trim(),
    }))
    .filter((s) => s.filename.length > 0 && s.notes.length > 0)
    .sort((a, b) => a.filename.localeCompare(b.filename));

  const sessionNotesCanonical = JSON.stringify(sessionNotes);

  // Aggregate raw shots → compact, decision-ready payload. This is what the
  // model actually sees and what we hash for content-based caching.
  const aggregate = aggregateShots(shots, { timeframe, filename });
  const aggregateJson = JSON.stringify(aggregate);
  const inputHash = createHash("sha256")
    .update(
      `${PROMPT_VERSION}\n${MODEL}\n${aggregateJson}\n${sessionNotesCanonical}`,
    )
    .digest("hex");

  const db = await getDb();

  // Cache lookup unless caller explicitly asked to regenerate.
  if (!force) {
    const cached = await db.execute({
      sql: "SELECT id, created_at, shot_count, timeframe, filename, analysis FROM reports WHERE input_hash = ? ORDER BY created_at DESC LIMIT 1",
      args: [inputHash],
    });
    const row = cached.rows[0];
    if (row) {
      console.log(
        `[analyze] cache hit for ${inputHash.slice(0, 8)} → report ${row.id}`,
      );
      res.json({
        id: row.id,
        createdAt: new Date((row.created_at as number) * 1000).toISOString(),
        shotCount: row.shot_count,
        timeframe: row.timeframe,
        filename: row.filename,
        analysis: JSON.parse(row.analysis as string),
        cached: true,
      });
      return;
    }
  }

  const notesBlock =
    sessionNotes.length === 0
      ? ""
      : `

Session notes (player-provided context per file):
${sessionNotes.map((s) => `--- ${s.filename} ---\n${s.notes}`).join("\n\n")}`;

  const userMessage = `Timeframe: ${timeframe}
Files: ${filename}
${notesBlock}

Aggregated shot data (computed from ${aggregate.meta.totalShots} raw shots, ${aggregate.meta.outliersDropped} dropped as IQR outliers):
${aggregateJson}`;

  try {
    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      // gpt-5-mini isn't in the SDK's typed ChatModel union yet; the API
      // accepts the string at runtime. Cast scoped narrowly.
      model: MODEL as unknown as Parameters<
        typeof client.chat.completions.create
      >[0]["model"],
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      response_format: zodResponseFormat(
        AIAnalysisResultSchema,
        "ai_analysis_result",
      ),
      reasoning_effort: REASONING_EFFORT,
      max_completion_tokens: MAX_COMPLETION_TOKENS,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error("Empty response from OpenAI");
    const analysis = AIAnalysisResultSchema.parse(JSON.parse(raw));

    // Surface usage so we can confirm prompt-cache hits and tune token caps.
    const usage = completion.usage;
    if (usage) {
      const cachedInput =
        (usage as { prompt_tokens_details?: { cached_tokens?: number } })
          .prompt_tokens_details?.cached_tokens ?? 0;
      console.log(
        `[analyze] usage prompt=${usage.prompt_tokens} cached=${cachedInput} completion=${usage.completion_tokens} total=${usage.total_tokens}`,
      );
    }

    const id = uuidv4();
    const now = Math.floor(Date.now() / 1000);

    await db.execute({
      sql: "INSERT INTO reports (id, created_at, shot_count, timeframe, filename, analysis, input_hash) VALUES (?, ?, ?, ?, ?, ?, ?)",
      args: [
        id,
        now,
        shots.length,
        timeframe,
        filename,
        JSON.stringify(analysis),
        inputHash,
      ],
    });

    res.json({
      id,
      createdAt: new Date(now * 1000).toISOString(),
      shotCount: shots.length,
      timeframe,
      filename,
      analysis,
      cached: false,
    });
  } catch (err) {
    console.error("OpenAI error:", err);
    res.status(500).json({ error: "Analysis failed" });
  }
});

export default router;
