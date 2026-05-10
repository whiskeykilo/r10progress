/**
 * Rough bridge from lateral dispersion ellipse to expected penalty strokes.
 * Uses a Gaussian lateral model calibrated so ~95% of mass lies within ±ellipseHalfWidth.
 */

export type PenaltyEstimateInput = {
  /** Lateral ellipse width (yards), same units as aggregate dispersionEllipse.width */
  ellipseWidthYds: number;
  /** Full fairway width (yards), default ~32 */
  fairwayWidthYds: number;
  /** Holes per round where driver landing zone has OB/water etc. */
  hazardAdjacentDriverHoles: number;
  /** Expected penalty strokes when a tee shot misses into that hazard corridor */
  strokesPerHazardEvent: number;
};

export type PenaltyEstimateResult = {
  sigmaYds: number;
  probabilityOutsideFairwayPerTeeShot: number;
  expectedPenaltyStrokesPerRound: number;
};

function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * ax);
  const y =
    1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return sign * y;
}

/** P(Z <= z) for standard normal Z */
function normalCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

/**
 * Two-sided probability that |X| > halfFairway where X ~ N(0, sigma).
 */
export function lateralMissProbability(
  sigmaYds: number,
  fairwayHalfWidthYds: number,
): number {
  if (sigmaYds <= 0 || fairwayHalfWidthYds <= 0) return 1;
  const z = fairwayHalfWidthYds / sigmaYds;
  const pInside = normalCdf(z) - normalCdf(-z);
  return Math.min(1, Math.max(0, 1 - pInside));
}

export function estimatePenaltyStrokesPerRound(
  input: PenaltyEstimateInput,
): PenaltyEstimateResult {
  const halfFairway = input.fairwayWidthYds / 2;
  const sigmaYds = input.ellipseWidthYds / (2 * 1.96);
  const pShot = lateralMissProbability(sigmaYds, halfFairway);
  const expected =
    input.hazardAdjacentDriverHoles * pShot * input.strokesPerHazardEvent;
  return {
    sigmaYds: Math.round(sigmaYds * 100) / 100,
    probabilityOutsideFairwayPerTeeShot: Math.round(pShot * 10000) / 10000,
    expectedPenaltyStrokesPerRound: Math.round(expected * 100) / 100,
  };
}
