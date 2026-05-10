import type { AIAnalysisResult } from "../schema/aiReport";
import type { ShotAggregate } from "./aggregate";

export const PRESCRIPTIVE_MIN_SHOTS = 25;
export const DIRECTIONAL_MIN_SHOTS = 10;

export type SampleTier = "prescriptive" | "directional" | "report_only";

export function sampleTierForCount(n: number): SampleTier {
  if (n >= PRESCRIPTIVE_MIN_SHOTS) return "prescriptive";
  if (n >= DIRECTIONAL_MIN_SHOTS) return "directional";
  return "report_only";
}

function findDriver(aggregate: ShotAggregate) {
  return aggregate.clubs.find((c) =>
    c.clubName.toLowerCase().includes("driver"),
  );
}

/** Detect cues that ask player to close face more (would bias start further left). */
function proseSuggestsClosingFace(text: string): boolean {
  const t = text.toLowerCase();
  return (
    /\b(close|closing|shut)\s+(your\s+)?(club)?face\b/.test(t) ||
    /\bstronger\s+grip\b/.test(t) ||
    /\bfeel\s+a\s+slightly\s+closed\s+face\b/.test(t) ||
    /\bclose\s+the\s+face\b/.test(t)
  );
}

export type GuardrailResult = {
  blockedPrescriptions: string[];
  driverDominantMiss: "left" | "right" | "balanced" | "unknown";
};

export function evaluateDriverFacePrescriptionGuardrail(
  aggregate: ShotAggregate,
  textsToScan: string[],
): GuardrailResult {
  const blocked: string[] = [];
  const driver = findDriver(aggregate);
  if (!driver || driver.shotCount < DIRECTIONAL_MIN_SHOTS) {
    return {
      blockedPrescriptions: blocked,
      driverDominantMiss: "unknown",
    };
  }

  const { leftPct, rightPct } = driver.dispersion;
  let driverDominantMiss: GuardrailResult["driverDominantMiss"] = "balanced";
  if (leftPct > rightPct + 8) driverDominantMiss = "left";
  else if (rightPct > leftPct + 8) driverDominantMiss = "right";

  if (driverDominantMiss !== "left") {
    return { blockedPrescriptions: blocked, driverDominantMiss };
  }

  const blob = textsToScan.join("\n");
  if (proseSuggestsClosingFace(blob)) {
    blocked.push(
      `Blocked face prescription: dominant driver miss is left (${leftPct}% left vs ${rightPct}% right); suggesting a more closed face typically worsens that pattern (D-Plane: face strongly influences start direction).`,
    );
  }

  return { blockedPrescriptions: blocked, driverDominantMiss };
}

function hypothesisPrefix(tier: SampleTier): string {
  if (tier === "directional") return "Hypothesis to test (limited sample): ";
  if (tier === "report_only")
    return "Observation only — collect more swings before prescribing: ";
  return "";
}

/**
 * Apply sample-size gates + strip risky face prescriptions from drills / focus text.
 */
export function applyRecommendationGuardrails(params: {
  aggregate: ShotAggregate;
  analysis: AIAnalysisResult;
}): { analysis: AIAnalysisResult; guardrailNotes: string[] } {
  const { aggregate, analysis } = params;
  const n = aggregate.global.shotsAnalyzed;
  const tier = sampleTierForCount(n);
  const notes: string[] = [];

  const drillTexts = analysis.practiceRecommendations.drills.flatMap((d) => [
    d.name,
    d.purpose,
    ...d.steps,
    ...d.successMetrics,
  ]);

  const guard = evaluateDriverFacePrescriptionGuardrail(aggregate, [
    analysis.practiceRecommendations.highPriorityFocus,
    ...drillTexts,
    ...analysis.statistics.commonIssues.map((x) => x.issue),
  ]);
  notes.push(...guard.blockedPrescriptions);

  let highPriorityFocus = analysis.practiceRecommendations.highPriorityFocus;
  let drills = [...analysis.practiceRecommendations.drills];

  if (guard.blockedPrescriptions.length > 0) {
    highPriorityFocus = `[Prescription check] ${guard.blockedPrescriptions[0]} Adjust drill cues accordingly.\n${highPriorityFocus}`;
    drills = drills.map((d) => {
      const blob = [d.name, d.purpose, ...d.steps].join(" ");
      if (!proseSuggestsClosingFace(blob)) return d;
      return {
        ...d,
        purpose:
          "Replace prior cue with neutral face / start-line task — dominant miss is left; verify aim and path.",
        steps: d.steps.map((step) =>
          proseSuggestsClosingFace(step)
            ? "Neutral face reference + start-line gate only (avoid closing face cues while left miss dominates)."
            : step,
        ),
      };
    });
  }

  if (tier === "report_only") {
    highPriorityFocus = `${hypothesisPrefix(tier)}n=${n}. ${highPriorityFocus}`;
    drills = [];
    notes.push(
      `Sample size n=${n} < ${DIRECTIONAL_MIN_SHOTS}: drills withheld — report-only tier.`,
    );
  } else if (tier === "directional") {
    highPriorityFocus = `${hypothesisPrefix(tier)}n=${n}. ${highPriorityFocus}`;
    drills = drills.map((d) => ({
      ...d,
      purpose: `${hypothesisPrefix("directional")}${d.purpose}`,
      difficulty: d.difficulty === "advanced" ? "intermediate" : d.difficulty,
    }));
    notes.push(
      `Sample size n=${n}: directional tier (${DIRECTIONAL_MIN_SHOTS}–${PRESCRIPTIVE_MIN_SHOTS - 1}) — avoid definitive drill prescriptions.`,
    );
  }

  return {
    analysis: {
      ...analysis,
      practiceRecommendations: {
        highPriorityFocus,
        drills,
      },
    },
    guardrailNotes: notes,
  };
}
