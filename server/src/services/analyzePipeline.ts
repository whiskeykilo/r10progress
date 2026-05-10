import { createHash } from "crypto";
import type { Client } from "@libsql/client";
import OpenAI, { APIConnectionTimeoutError } from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { Reasoning } from "openai/resources/shared";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
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

const EnvSchema = z.enum(["indoor", "outdoor", "unknown"]);

export const AnalyzeBodySchema = z.object({
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

export type AnalyzeBody = z.infer<typeof AnalyzeBodySchema>;

export type AnalyzeApiResponse = {
  id: string;
  createdAt: string;
  shotCount: number;
  timeframe: string;
  filename: string;
  analysis: unknown;
  cached: boolean;
};

/**
 * Default analyze model (Responses API). Override with OPENAI_ANALYZE_MODEL.
 * Frontier GPT-5.x class models use `v1/responses`, not Chat Completions.
 */
export function resolveAnalyzeModel(): string {
  const m = process.env.OPENAI_ANALYZE_MODEL?.trim();
  return m && m.length > 0 ? m : "gpt-5.5";
}

/**
 * Default `medium` reasoning effort on Responses API. Override with OPENAI_REASONING_EFFORT.
 * Set to `none` or `off` to omit the `reasoning` parameter for models that do not support it.
 */
export function resolveReasoningEffort(): string | undefined {
  const r = process.env.OPENAI_REASONING_EFFORT?.trim();
  if (r && (/^none$/i.test(r) || /^off$/i.test(r))) return undefined;
  if (!r || r.length === 0) return "medium";
  return r;
}

export function resolveOpenAiTimeoutMs(): number {
  const raw = process.env.OPENAI_TIMEOUT_MS;
  const n = raw ? Number.parseInt(raw, 10) : Number.NaN;
  if (Number.isFinite(n) && n >= 60_000) {
    return Math.min(n, 3_600_000);
  }
  return 1_800_000;
}

function createOpenAIClient(apiKey: string): OpenAI {
  return new OpenAI({
    apiKey,
    timeout: resolveOpenAiTimeoutMs(),
    maxRetries: 0,
  });
}

// Headroom for structured output + reasoning; raise if responses truncate.
const MAX_OUTPUT_TOKENS = 9000;

/** Thrown when Responses API returns no usable structured analysis payload. */
export class AnalyzeStructuredOutputError extends Error {
  constructor() {
    super(
      "The AI did not return a complete structured report. Try fewer sessions or shots, then run analysis again.",
    );
    this.name = "AnalyzeStructuredOutputError";
  }
}

export async function tryGetCachedAnalyzeResponse(
  db: Client,
  inputHash: string,
  force: boolean | undefined,
): Promise<AnalyzeApiResponse | null> {
  if (force) return null;
  const cached = await db.execute({
    sql: "SELECT id, created_at, shot_count, timeframe, filename, analysis FROM reports WHERE input_hash = ? ORDER BY created_at DESC LIMIT 1",
    args: [inputHash],
  });
  const row = cached.rows[0];
  if (!row) return null;
  console.log(
    `[analyze] cache hit for ${inputHash.slice(0, 8)} → report ${row.id}`,
  );
  return {
    id: row.id as string,
    createdAt: new Date((row.created_at as number) * 1000).toISOString(),
    shotCount: row.shot_count as number,
    timeframe: row.timeframe as string,
    filename: row.filename as string,
    analysis: JSON.parse(row.analysis as string),
    cached: true,
  };
}

export type AnalyzePipelineContext = {
  body: AnalyzeBody;
  sessionNotes: { filename: string; notes: string }[];
  sessionNotesCanonical: string;
  profileCanonical: string;
  environmentsCanonical: string;
  aggOptions: AggregateShotsOptions | undefined;
  aggregate: ReturnType<typeof aggregateShots>;
  aggregateJson: string;
  indoorHeavy: boolean;
  sgFirstPlan: ReturnType<typeof finalizeSgFirstPlan>;
  analyzeModel: string;
  reasoningEffort: string | undefined;
  reasoningKey: string;
  inputHash: string;
  userMessage: string;
};

export function buildAnalyzePipelineContext(
  body: AnalyzeBody,
): AnalyzePipelineContext {
  const sessionNotes = (body.sessionNotes ?? [])
    .map(({ filename: fn, notes }) => ({
      filename: fn.trim(),
      notes: notes.trim(),
    }))
    .filter((s) => s.filename.length > 0 && s.notes.length > 0)
    .sort((a, b) => a.filename.localeCompare(b.filename));

  const sessionNotesCanonical = JSON.stringify(sessionNotes);
  const aggOptions: AggregateShotsOptions | undefined =
    body.environmentBySessionFile &&
      Object.keys(body.environmentBySessionFile).length
      ? { environmentBySessionFile: body.environmentBySessionFile }
      : undefined;
  const profileCanonical = JSON.stringify(body.playerProfile ?? {});
  const environmentsCanonical = JSON.stringify(
    body.environmentBySessionFile ?? {},
  );

  const aggregate = aggregateShots(
    body.shots,
    { timeframe: body.timeframe, filename: body.filename },
    aggOptions,
  );
  const aggregateJson = JSON.stringify(aggregate);
  const indoorHeavy =
    aggregate.meta.environmentMix.indoor >
    aggregate.meta.environmentMix.outdoor;
  const sgFirstPlan = finalizeSgFirstPlan(
    buildSgFirstPlan({
      aggregate,
      handicapIndex: body.playerProfile?.handicapIndex ?? null,
      indoorHeavy,
    }),
    aggregate,
  );

  const analyzeModel = resolveAnalyzeModel();
  const reasoningEffort = resolveReasoningEffort();
  const reasoningKey = reasoningEffort ?? "none";

  const inputHash = createHash("sha256")
    .update(
      `${PROMPT_VERSION}\n${analyzeModel}\n${reasoningKey}\n${aggregateJson}\n${sessionNotesCanonical}\n${profileCanonical}\n${environmentsCanonical}`,
    )
    .digest("hex");

  const notesBlock =
    sessionNotes.length === 0
      ? ""
      : `

Session notes (player-provided context per file):
${sessionNotes.map((s) => `--- ${s.filename} ---\n${s.notes}`).join("\n\n")}`;

  const userMessage = `Timeframe: ${body.timeframe}
Files: ${body.filename}
${notesBlock}

Aggregated shot data (computed from ${aggregate.meta.totalShots} raw shots, ${aggregate.meta.outliersDropped} dropped as IQR outliers):
${aggregateJson}`;

  return {
    body,
    sessionNotes,
    sessionNotesCanonical,
    profileCanonical,
    environmentsCanonical,
    aggOptions,
    aggregate,
    aggregateJson,
    indoorHeavy,
    sgFirstPlan,
    analyzeModel,
    reasoningEffort,
    reasoningKey,
    inputHash,
    userMessage,
  };
}

/**
 * Run OpenAI + persistence. Caller must verify cache miss first.
 */
export async function runOpenAIAnalyzeAndPersist(
  db: Client,
  ctx: AnalyzePipelineContext,
  apiKey: string,
): Promise<AnalyzeApiResponse> {
  const {
    body,
    aggregate,
    sgFirstPlan,
    analyzeModel,
    reasoningEffort,
    reasoningKey,
    inputHash,
    userMessage,
  } = ctx;

  const client = createOpenAIClient(apiKey);
  console.log(
    `[analyze] OpenAI Responses API model=${analyzeModel} reasoning_effort=${reasoningKey}`,
  );

  const parsed = await client.responses.parse({
    model: analyzeModel,
    instructions: SYSTEM_PROMPT,
    input: userMessage,
    text: {
      format: zodTextFormat(AIAnalysisResultSchema, "ai_analysis_result"),
    },
    max_output_tokens: MAX_OUTPUT_TOKENS,
    stream: false,
    ...(reasoningEffort !== undefined
      ? {
        reasoning: { effort: reasoningEffort } as Reasoning,
      }
      : {}),
  });

  if (parsed.error) {
    throw new Error(parsed.error.message ?? "OpenAI response error");
  }

  const analysisRaw = parsed.output_parsed;
  if (analysisRaw == null) {
    const textLen = parsed.output_text?.length ?? 0;
    console.warn(
      `[analyze] Responses API: missing output_parsed model=${analyzeModel} reasoning_effort=${reasoningKey} output_text_len=${textLen}`,
    );
    throw new AnalyzeStructuredOutputError();
  }

  let analysis: z.infer<typeof AIAnalysisResultSchema>;
  try {
    analysis = AIAnalysisResultSchema.parse(analysisRaw);
  } catch (e) {
    if (e instanceof z.ZodError) {
      console.warn(
        "[analyze] AIAnalysisResultSchema.parse failed",
        e.flatten(),
      );
      throw new AnalyzeStructuredOutputError();
    }
    throw e;
  }

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

  const usage = parsed.usage;
  if (usage) {
    const cachedInput = usage.input_tokens_details?.cached_tokens ?? 0;
    console.log(
      `[analyze] usage input=${usage.input_tokens} cached=${cachedInput} output=${usage.output_tokens} total=${usage.total_tokens}`,
    );
  }

  const id = uuidv4();
  const now = Math.floor(Date.now() / 1000);

  await db.execute({
    sql: "INSERT INTO reports (id, created_at, shot_count, timeframe, filename, analysis, input_hash) VALUES (?, ?, ?, ?, ?, ?, ?)",
    args: [
      id,
      now,
      body.shots.length,
      body.timeframe,
      body.filename,
      JSON.stringify(persisted),
      inputHash,
    ],
  });

  return {
    id,
    createdAt: new Date(now * 1000).toISOString(),
    shotCount: body.shots.length,
    timeframe: body.timeframe,
    filename: body.filename,
    analysis: persisted,
    cached: false,
  };
}

export function isOpenAiTimeoutError(err: unknown): boolean {
  return err instanceof APIConnectionTimeoutError;
}

export { APIConnectionTimeoutError };
