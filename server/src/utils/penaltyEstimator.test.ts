import { describe, expect, it } from "vitest";
import {
  estimatePenaltyStrokesPerRound,
  lateralMissProbability,
} from "./penaltyEstimator";

describe("penaltyEstimator", () => {
  it("lateralMissProbability is in (0,1) for reasonable inputs", () => {
    const sigma = 25.77;
    const halfFairway = 16;
    const p = lateralMissProbability(sigma, halfFairway);
    expect(p).toBeGreaterThan(0.05);
    expect(p).toBeLessThan(0.95);
  });

  it("tighter ellipse yields fewer expected penalties than wide ellipse", () => {
    const wide = estimatePenaltyStrokesPerRound({
      ellipseWidthYds: 101,
      fairwayWidthYds: 32,
      hazardAdjacentDriverHoles: 6,
      strokesPerHazardEvent: 1,
    });
    const tight = estimatePenaltyStrokesPerRound({
      ellipseWidthYds: 60,
      fairwayWidthYds: 32,
      hazardAdjacentDriverHoles: 6,
      strokesPerHazardEvent: 1,
    });
    expect(wide.sigmaYds).toBeCloseTo(101 / (2 * 1.96), 2);
    expect(tight.expectedPenaltyStrokesPerRound).toBeLessThan(
      wide.expectedPenaltyStrokesPerRound,
    );
  });
});
