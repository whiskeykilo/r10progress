import { createHash } from "crypto";
import { Router } from "express";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { getDb } from "../db";
import { SYSTEM_PROMPT } from "../prompts/system";
import {
  AIAnalysisResultSchema,
  PersistedAnalysisSchema,
  PROMPT_VERSION,
} from "../schema/aiReport";
import { aggregateShots } from "../utils/aggregate";
import type { AggregateShotsOptions } from "../utils/aggregate";
import {
  analyzeBallFlightConsistency,
  D_PLANE_CITATION,
} from "../utils/ballFlightConsistency";
import {
  applyRecommendationGuardrails,
  PRESCRIPTIVE_MIN_SHOTS,
  sampleTierForCount,
} from "../utils/recommendationGuardrails";
import { buildDeterministicReportBundle } from "../utils/reportDeterministic";
import {
  buildSgFirstPlan,
  finalizeSgFirstPlan,
} from "../utils/sgRecommendations";

const router = Router();

const EnvSchema = z.enum(["indoor", "outdoor", "unknown"]);

const BodySchema = z.object({
  shots: z.array(z.record(z.unknown())),
  timeframe: z.string(),
  filename: z.string(),
  force: z.boolean().optional(),
  environmentBySessionFile: z.record(EnvSchema).optional(),
  playerProfile: z
    .object({
      handicapIndex: z.number().min(0).max(54).nullable().optional(),
      clubLoftsByName: z.record(z.number()).optional(),
    })
    .optional(),
  sessionNotes: z
    .array(
      z.object({
        filename: z.string(),
        notes: z.string(),
      }),
    )
    .optional(),
});

// Frontier analytical model — hard-coded (no env override).
const MODEL = "gpt-5.2";
const REASONING_EFFORT = "xhigh" as const;

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
    environmentBySessionFile,
    playerProfile,
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
  const aggOptions: AggregateShotsOptions | undefined =
    environmentBySessionFile && Object.keys(environmentBySessionFile).length
      ? { environmentBySessionFile }
      : undefined;
  const profileCanonical = JSON.stringify(playerProfile ?? {});
  const environmentsCanonical = JSON.stringify(environmentBySessionFile ?? {});

  // Aggregate raw shots → compact, decision-ready payload. This is what the
  // model actually sees and what we hash for content-based caching.
  const aggregate = aggregateShots(shots, { timeframe, filename }, aggOptions);
  const aggregateJson = JSON.stringify(aggregate);
  const indoorHeavy =
    aggregate.meta.environmentMix.indoor >
    aggregate.meta.environmentMix.outdoor;
  const sgFirstPlan = finalizeSgFirstPlan(
    buildSgFirstPlan({
      aggregate,
      handicapIndex: playerProfile?.handicapIndex ?? null,
      indoorHeavy,
    }),
    aggregate,
  );
  const inputHash = createHash("sha256")
    .update(
      `${PROMPT_VERSION}\n${MODEL}\n${aggregateJson}\n${sessionNotesCanonical}\n${profileCanonical}\n${environmentsCanonical}`,
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
      // SDK ReasoningEffort union may lag newer API values; runtime sends xhigh.
      reasoning_effort: REASONING_EFFORT as unknown as never,
      max_completion_tokens: MAX_COMPLETION_TOKENS,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error("Empty response from OpenAI");
    let analysis = AIAnalysisResultSchema.parse(JSON.parse(raw));

    const ballFlightContradictions = analyzeBallFlightConsistency(
      aggregate,
      analysis,
    );

    const guarded = applyRecommendationGuardrails({ aggregate, analysis });
    analysis = guarded.analysis;
    const tier = sampleTierForCount(aggregate.global.shotsAnalyzed);
    const guardrailNotes = [...guarded.guardrailNotes];

    if (tier !== "prescriptive") {
      const tc = aggregate.global.topConcerns.slice(0, 2).join(" · ");
      analysis = {
        ...analysis,
        practiceRecommendations: {
          ...analysis.practiceRecommendations,
          highPriorityFocus: `[Aggregate-led priority — sample below ${PRESCRIPTIVE_MIN_SHOTS} for prescriptive drills] ${tc || "Collect more swings."}`,
        },
      };
    }

    if (ballFlightContradictions.length > 0) {
      analysis = {
        ...analysis,
        practiceRecommendations: {
          ...analysis.practiceRecommendations,
          highPriorityFocus: `[Consistency flags] ${ballFlightContradictions[0]} (${D_PLANE_CITATION})\n${analysis.practiceRecommendations.highPriorityFocus}`,
        },
      };
    }

    const deterministic = buildDeterministicReportBundle({
      aggregate,
      ballFlightContradictions,
      dPlaneCitation: D_PLANE_CITATION,
      sampleTier: tier,
      guardrailNotes,
    });

    const persisted = PersistedAnalysisSchema.parse({
      ...analysis,
      sgFirstPlan,
      deterministic,
    });

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
        JSON.stringify(persisted),
        inputHash,
      ],
    });

    res.json({
      id,
      createdAt: new Date(now * 1000).toISOString(),
      shotCount: shots.length,
      timeframe,
      filename,
      analysis: persisted,
      cached: false,
    });
  } catch (err) {
    console.error("OpenAI error:", err);
    res.status(500).json({ error: "Analysis failed" });
  }
});

export default router;
