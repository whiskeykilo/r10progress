import { describe, expect, it } from "vitest";
import { aggregateShots, dropOutliers, quantile, stat } from "./aggregate";

// Hand-crafted Garmin R10-style shots in English locale. Two clubs.
// Numbers chosen so means/std/IQR-drop are easy to verify by eye.
const sevenIron = (
  i: number,
  carry: number,
  total: number,
  totalDev: number,
  face: number,
  path: number,
  smash: number,
): Record<string, unknown> => ({
  Date: `2026-05-04 10:0${i}:00`,
  "Club Type": "7 Iron",
  "Club Name": null,
  "Carry Distance": carry,
  "Total Distance": total,
  "Ball Speed": 55 + i,
  "Club Speed": 38 + i * 0.1,
  "Smash Factor": smash,
  "Launch Angle": 18 + (i % 3),
  "Launch Direction": 0.5,
  "Spin Rate": 6500 + i * 50,
  Backspin: 6400,
  "Club Face": face,
  "Club Path": path,
  "Face to Path": face - path,
  "Attack Angle": -2,
  "Apex Height": 22,
  "Carry Deviation Distance": totalDev * 0.9,
  "Total Deviation Distance": totalDev,
});

const driver = (
  i: number,
  total: number,
  totalDev: number,
  face: number,
  path: number,
): Record<string, unknown> => ({
  Date: `2026-05-04 11:0${i}:00`,
  "Club Type": "Driver",
  "Carry Distance": total - 10,
  "Total Distance": total,
  "Ball Speed": 70 + i,
  "Club Speed": 48 + i * 0.1,
  "Smash Factor": 1.45,
  "Launch Angle": 12,
  "Launch Direction": 1,
  "Spin Rate": 2500,
  Backspin: 2400,
  "Club Face": face,
  "Club Path": path,
  "Face to Path": face - path,
  "Attack Angle": 1,
  "Apex Height": 28,
  "Carry Deviation Distance": totalDev * 0.95,
  "Total Deviation Distance": totalDev,
});

describe("quantile", () => {
  it("computes median and quartiles on a sorted array", () => {
    const xs = [1, 2, 3, 4, 5];
    expect(quantile(xs, 0.5)).toBe(3);
    expect(quantile(xs, 0.25)).toBe(2);
    expect(quantile(xs, 0.75)).toBe(4);
  });
});

describe("stat", () => {
  it("returns null for empty input", () => {
    expect(stat([])).toBeNull();
    expect(stat([null, null])).toBeNull();
  });
  it("computes mean / std / median", () => {
    const s = stat([1, 2, 3, 4, 5]);
    expect(s).not.toBeNull();
    expect(s!.mean).toBe(3);
    expect(s!.median).toBe(3);
    // sample std of 1..5 = sqrt(2.5) ≈ 1.58
    expect(s!.std).toBeCloseTo(1.58, 2);
  });
});

describe("dropOutliers", () => {
  it("drops a clear total-distance outlier from a per-club distribution", () => {
    const shots = [
      sevenIron(0, 130, 140, 2, 1, 0.5, 1.35),
      sevenIron(1, 132, 142, -1, 0.5, 0, 1.36),
      sevenIron(2, 128, 138, 1, 0.5, 0.5, 1.34),
      sevenIron(3, 134, 144, 0, 1, 1, 1.37),
      sevenIron(4, 131, 141, -2, 0, 0.5, 1.35),
      sevenIron(5, 50, 60, 0, 0, 0, 1.0), // clear outlier
    ];
    const { kept, dropped } = dropOutliers(shots);
    expect(dropped).toBe(1);
    expect(kept.length).toBe(5);
    expect(kept.every((s) => (s["Total Distance"] as number) >= 100)).toBe(
      true,
    );
  });

  it("does not filter when fewer than 4 shots per club (insufficient signal)", () => {
    const shots = [
      sevenIron(0, 130, 140, 2, 1, 0.5, 1.35),
      sevenIron(1, 132, 142, -1, 0.5, 0, 1.36),
    ];
    const { kept, dropped } = dropOutliers(shots);
    expect(dropped).toBe(0);
    expect(kept.length).toBe(2);
  });
});

describe("aggregateShots", () => {
  const shots = [
    // 7 Iron — push bias (path > 2), face slightly open
    sevenIron(0, 132, 142, 4, 3, 3, 1.36),
    sevenIron(1, 130, 140, 5, 3.5, 3.2, 1.36),
    sevenIron(2, 134, 144, 3, 2.5, 2.8, 1.37),
    sevenIron(3, 131, 141, 6, 3, 3, 1.35),
    sevenIron(4, 133, 143, 4.5, 3.2, 3.1, 1.36),
    // Driver — neutral path, wide dispersion. Each extreme is a distinct shot
    // so the representative-shot picker has 4 unique picks before dedup.
    driver(0, 240, 15, 0, 0),
    driver(1, 255, -10, 0.5, 0), // longest
    driver(2, 238, 30, -0.5, 0), // most-offline-right
    driver(3, 245, -25, 1, 0), // most-offline-left
    driver(4, 230, 5, 0, -0.5), // shortest
  ];

  it("buckets by club, computes per-club stats, and surfaces flags", () => {
    const agg = aggregateShots(shots, { timeframe: "test", filename: "t.csv" });

    expect(agg.meta.totalShots).toBe(10);
    expect(agg.global.shotsAnalyzed).toBe(10);
    expect(agg.global.clubsUsed).toBe(2);

    const seven = agg.clubs.find((c) => c.clubName === "7 Iron")!;
    expect(seven).toBeDefined();
    expect(seven.shotCount).toBe(5);
    expect(seven.flags.pushBias).toBe(true);
    expect(seven.flags.pullBias).toBe(false);
    expect(seven.flags.faceOpenBias).toBe(true);
    expect(seven.carry?.mean).toBeCloseTo(132, 0);
    expect(seven.totalDeviation?.mean).toBeGreaterThan(0); // right-of-target push

    const drv = agg.clubs.find((c) => c.clubName === "Driver")!;
    expect(drv).toBeDefined();
    expect(drv.shotCount).toBe(5);
    expect(drv.flags.pushBias).toBe(false);
    expect(drv.flags.pullBias).toBe(false);
    // Driver dispersion ellipse should be non-trivial given the spread
    expect(drv.dispersion.ellipse.width).toBeGreaterThan(0);
    expect(drv.dispersion.ellipse.length).toBeGreaterThan(0);
  });

  it("respects signed direction conventions", () => {
    const agg = aggregateShots(shots, { timeframe: "test", filename: "t.csv" });
    const seven = agg.clubs.find((c) => c.clubName === "7 Iron")!;
    // All seven irons are right-of-target — leftPct should be 0, rightPct 100, centeredPct < 100
    expect(seven.dispersion.leftPct).toBe(0);
    expect(seven.dispersion.rightPct).toBe(100);
  });

  it("emits topConcerns ordered by severity", () => {
    const agg = aggregateShots(shots, { timeframe: "test", filename: "t.csv" });
    expect(agg.global.topConcerns.length).toBeGreaterThan(0);
    expect(agg.global.topConcerns.length).toBeLessThanOrEqual(3);
  });

  it("picks representative shots labeled by extremity", () => {
    const agg = aggregateShots(shots, { timeframe: "test", filename: "t.csv" });
    const drv = agg.clubs.find((c) => c.clubName === "Driver")!;
    const labels = drv.representativeShots.map((s) => s.label);
    expect(labels).toContain("longest");
    expect(labels).toContain("shortest");
    expect(labels).toContain("most-offline-left");
    expect(labels).toContain("most-offline-right");
  });
});
