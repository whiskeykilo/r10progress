// Canonical AI analysis schema. Used by:
//   - openai/helpers/zod's zodResponseFormat in routes/analyze.ts (model output)
//   - server-side validation of stored reports
//
// IMPORTANT: keep in sync with the frontend interface in
// src/utils/aiReportExample.ts. The two are intentionally duplicated because
// the server is CommonJS and the frontend is ESM/bundler with no shared
// workspace. If they ever diverge, promote this file to a shared package.
//
// Strict-mode caveats for OpenAI Structured Outputs:
//   - All fields must be required. Use .nullable() instead of .optional().
//   - Enums via z.enum() are fine.
//   - No discriminated unions or recursive references in this schema.

import { z } from "zod";

// Bump this string whenever the prompt or schema changes meaningfully.
// It's prefixed into the input hash so cache entries are invalidated by edits
// to the system prompt or this schema.
export const PROMPT_VERSION = "2026-05-09.v5-trust";

const ScoreBlockSchema = z.object({
  score: z.number(),
  consistency: z.number(),
  pattern: z.string(),
  recommendation: z.string(),
});

const DrillSchema = z.object({
  name: z.string(),
  purpose: z.string(),
  steps: z.array(z.string()),
  successMetrics: z.array(z.string()),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
});

const TrendSchema = z.enum(["improving", "declining", "stable"]);

const CommonIssueSchema = z.object({
  issue: z.string(),
  tag: z.enum(["strategy", "mechanics"]),
});

export const AIAnalysisResultSchema = z.object({
  technicalAnalysis: z.object({
    impactConditions: z.object({
      faceControl: ScoreBlockSchema,
      pathControl: ScoreBlockSchema,
      strikeQuality: ScoreBlockSchema,
    }),
    ballFlight: z.object({
      launchConditions: ScoreBlockSchema,
      spinControl: ScoreBlockSchema,
      dispersionControl: ScoreBlockSchema,
    }),
  }),
  performanceMetrics: z.object({
    consistencyScore: z.number(),
    accuracyScore: z.number(),
    efficiencyScore: z.number(),
    overallScore: z.number(),
  }),
  practiceRecommendations: z.object({
    highPriorityFocus: z.string(),
    drills: z.array(DrillSchema),
  }),
  statistics: z.object({
    consistencyMetrics: z.object({
      ballSpeedConsistency: z.number(),
      launchAngleConsistency: z.number(),
      spinRateConsistency: z.number(),
      dispersionPattern: z.object({
        averageOffline: z.number(),
        dispersionEllipse: z.object({
          width: z.number(),
          length: z.number(),
        }),
      }),
    }),
    commonIssues: z.array(CommonIssueSchema),
    trends: z.object({
      distanceTrend: TrendSchema,
      accuracyTrend: TrendSchema,
      consistencyTrend: TrendSchema,
    }),
  }),
});

export type AIAnalysisResult = z.infer<typeof AIAnalysisResultSchema>;

const SgDrillPlanSchema = z.object({
  name: z.string(),
  focus: z.string(),
  steps: z.array(z.string()),
});

export const SgRecommendationSchema = z.object({
  rank: z.number(),
  category: z.enum(["approach", "offTheTee", "aroundGreen", "putting"]),
  title: z.string(),
  rationale: z.string(),
  estimatedSgPerRound: z.number(),
  confidenceLabel: z.enum(["high", "medium", "low"]),
  evidenceLines: z.array(z.string()),
  supportingMetrics: z.array(
    z.object({ label: z.string(), value: z.string() }),
  ),
  drill: SgDrillPlanSchema,
  tag: z.enum(["strategy", "mechanics"]),
});

export const SgFirstPlanSchema = z.object({
  benchmarkVersionNote: z.string(),
  environmentNote: z.string(),
  handicapNote: z.string(),
  recommendations: z.array(SgRecommendationSchema),
});

const PenaltyScenarioSchema = z.object({
  ellipseWidthYds: z.number(),
  fairwayWidthYds: z.number(),
  hazardAdjacentDriverHoles: z.number(),
  sigmaYds: z.number(),
  probabilityOutsideFairwayPerTeeShot: z.number(),
  expectedPenaltyStrokesPerRound: z.number(),
});

export const DeterministicReportBundleSchema = z.object({
  ballFlightContradictions: z.array(z.string()),
  dPlaneCitation: z.string(),
  sampleTier: z.enum(["prescriptive", "directional", "report_only"]),
  guardrailNotes: z.array(z.string()),
  scoreRubricDisclosure: z.string(),
  penaltyEstimate: z
    .object({
      baseline: PenaltyScenarioSchema,
      targetWidthYds: z.number().nullable(),
      atTarget: PenaltyScenarioSchema.nullable(),
    })
    .nullable(),
  /** Per-club robust lateral dispersion + shot-shape summary (from aggregates). */
  clubDispersionRobust: z.array(
    z.object({
      clubName: z.string(),
      shotCount: z.number(),
      medianSignedDeviationYds: z.number(),
      iqrSignedDeviationYds: z.number(),
      tukeyLowOutliers: z.number(),
      tukeyHighOutliers: z.number(),
      shotShapePattern: z.enum([
        "two_way",
        "fade_bias",
        "draw_bias",
        "neutral",
      ]),
    }),
  ),
});

export type DeterministicReportBundle = z.infer<
  typeof DeterministicReportBundleSchema
>;

/** Stored report shape = LLM narrative + deterministic SG plan + server bundle. */
export const PersistedAnalysisSchema = AIAnalysisResultSchema.extend({
  sgFirstPlan: SgFirstPlanSchema,
  deterministic: DeterministicReportBundleSchema,
});

export type PersistedAnalysis = z.infer<typeof PersistedAnalysisSchema>;
export type SgFirstPlan = z.infer<typeof SgFirstPlanSchema>;
