import { describe, expect, it } from "vitest";
import { aggregateShots } from "./aggregate";
import { buildSgFirstPlan } from "./sgRecommendations";

const driverShot = (carry: number, total: number) => ({
  Date: `2026-05-06 09:02:01`,
  "Club Type": "Driver",
  "Carry Distance": carry,
  "Total Distance": total,
  "Ball Speed": 160,
  "Club Speed": 108,
  "Smash Factor": 1.48,
  "Launch Angle": 12,
  "Spin Rate": 2600,
  "Club Face": 0,
  "Club Path": 0,
  "Attack Angle": 0,
  "Total Deviation Distance": 4,
});

describe("buildSgFirstPlan", () => {
  it("ranks deterministic recommendations without throwing", () => {
    const shots = Array.from({ length: 12 }, (_, i) => ({
      ...driverShot(200 + i * 3, 220 + i * 4),
      __r10SessionFile: "sess.csv",
    }));
    const agg = aggregateShots(
      shots,
      { timeframe: "t", filename: "f.csv" },
      {
        environmentBySessionFile: { "sess.csv": "outdoor" },
      },
    );
    const plan = buildSgFirstPlan({
      aggregate: agg,
      handicapIndex: 12,
      indoorHeavy: false,
    });
    expect(plan.recommendations.length).toBeGreaterThan(0);
    const ranks = plan.recommendations.map((r) => r.rank);
    expect(ranks).toEqual(plan.recommendations.map((_, i) => i + 1));
  });
});
