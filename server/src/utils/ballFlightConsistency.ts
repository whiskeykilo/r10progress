/**
 * Deterministic checks: aggregated R10 numbers vs report prose (path sign,
 * coarse D-plane plausibility). Citations: modern ball-flight / D-Plane —
 * face angle dominates start direction; face-to-path dominates curvature
 * (TrackMan University D-Plane overview).
 */
import type { AIAnalysisResult } from "../schema/aiReport";
import type { ClubAggregate, ShotAggregate } from "./aggregate";

export const D_PLANE_CITATION =
  "D-Plane / new ball-flight laws: face angle largely sets start direction; face-to-path sets curvature (TrackMan D-Plane primer).";

/** Garmin R10 CSV convention for a right-handed golfer (see SYSTEM_PROMPT). */
export function describePathDirectionRH(meanPathDeg: number): string {
  if (meanPathDeg > 2) return "in-to-out";
  if (meanPathDeg < -2) return "out-to-in";
  return "near-neutral";
}

function collectReportProse(analysis: AIAnalysisResult): string {
  const parts: string[] = [];
  const push = (s: string) => {
    if (s.trim()) parts.push(s);
  };
  const ta = analysis.technicalAnalysis;
  for (const block of [
    ta.impactConditions.faceControl,
    ta.impactConditions.pathControl,
    ta.impactConditions.strikeQuality,
    ta.ballFlight.launchConditions,
    ta.ballFlight.spinControl,
    ta.ballFlight.dispersionControl,
  ]) {
    push(block.pattern);
    push(block.recommendation);
  }
  push(analysis.practiceRecommendations.highPriorityFocus);
  for (const d of analysis.practiceRecommendations.drills) {
    push(d.name);
    push(d.purpose);
    for (const step of d.steps) push(step);
  }
  for (const issue of analysis.statistics.commonIssues) push(issue.issue);
  return parts.join(" ").toLowerCase();
}

function findDriverClub(aggregate: ShotAggregate): ClubAggregate | undefined {
  return aggregate.clubs.find((c) =>
    c.clubName.toLowerCase().includes("driver"),
  );
}

/**
 * Returns human-readable contradiction messages (empty if none flagged).
 */
export function analyzeBallFlightConsistency(
  aggregate: ShotAggregate,
  analysis: AIAnalysisResult,
): string[] {
  const prose = collectReportProse(analysis);
  const issues: string[] = [];

  const driver = findDriverClub(aggregate);
  const primaryClub =
    driver ?? aggregate.clubs[0] ?? (undefined as ClubAggregate | undefined);

  if (!primaryClub || primaryClub.shotCount < 10) {
    return issues;
  }

  const pathMean = primaryClub.clubPath?.mean ?? 0;
  const faceMean = primaryClub.clubFace?.mean ?? 0;
  const f2pMean = primaryClub.faceToPath?.mean ?? faceMean - pathMean;
  const ldMean = primaryClub.launchDirection?.mean ?? 0;
  const { leftPct, rightPct } = primaryClub.dispersion;

  const mentionsIto =
    /\bin[-\s]?to[-\s]?out\b/.test(prose) ||
    /\binto[-\s]?out\b/.test(prose) ||
    /\bpositive\b[^\n]{0,40}\bpath\b/.test(prose);
  const mentionsOti =
    /\bout[-\s]?to[-\s]?in\b/.test(prose) ||
    /\bover[-\s]?the[-\s]?top\b/.test(prose) ||
    /\bnegative\b[^\n]{0,40}\bpath\b/.test(prose);

  if (pathMean < -2 && mentionsIto && !mentionsOti) {
    issues.push(
      `Path wording mismatch: ${primaryClub.clubName} mean club path ${pathMean}° is out-to-in for RH (Garmin: negative path = out-to-in); prose suggests in-to-out.`,
    );
  }
  if (pathMean > 2 && mentionsOti && !mentionsIto) {
    issues.push(
      `Path wording mismatch: ${primaryClub.clubName} mean club path ${pathMean}° is in-to-out for RH; prose suggests out-to-in.`,
    );
  }

  const dominantLeft = leftPct > rightPct + 12;
  const dominantRight = rightPct > leftPct + 12;

  const strongOpenToPath = f2pMean > 4;
  const strongClosedToPath = f2pMean < -4;

  if (
    dominantLeft &&
    strongOpenToPath &&
    ldMean > 1 &&
    primaryClub.shotCount >= 15
  ) {
    issues.push(
      `Physics review (${primaryClub.clubName}): dominant left miss (${leftPct}% left) vs strongly face-open-to-path (${f2pMean.toFixed(1)}°) and positive launch direction (${ldMean.toFixed(1)}°) — typically biases right-of-target start/curve; verify prose matches aggregates (${D_PLANE_CITATION})`,
    );
  }
  if (
    dominantRight &&
    strongClosedToPath &&
    ldMean < -1 &&
    primaryClub.shotCount >= 15
  ) {
    issues.push(
      `Physics review (${primaryClub.clubName}): dominant right miss (${rightPct}% right) vs strongly face-closed-to-path (${f2pMean.toFixed(1)}°) and negative launch direction (${ldMean.toFixed(1)}°) — typically biases left-of-target start/curve; verify prose (${D_PLANE_CITATION})`,
    );
  }

  return issues;
}
