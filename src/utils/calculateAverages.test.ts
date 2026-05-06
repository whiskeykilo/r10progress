import { describe, expect, test } from "vitest";
import type { GolfSwingData } from "../types/GolfSwingData";
import type { SettingsType } from "../provider/SettingsContext";
import { calculateAverages, filterShotsByQuality } from "./calculateAverages";

const makeShot = (
  club: string,
  carry: number,
  totalDistance: number,
  smash: number,
): GolfSwingData =>
  ({
    "Club Type": club,
    "Carry Distance": carry,
    "Total Distance": totalDistance,
    "Smash Factor": smash,
  }) as GolfSwingData;

const baseSettings: SettingsType = {
  useIQR: false,
  useAboveAverageShots: false,
  useShotQualityFilter: true,
  shotQualitySdMode: "asymmetric",
  unit: "yards",
  applyRangeBallCompensation: false,
  rangeBallCompensation: {
    wedges: 1.05,
    shortIrons: 1.06,
    midLongIrons: 1.07,
    hybridsWoodsDriver: 1.08,
  },
};

describe("filterShotsByQuality", () => {
  test("supports asymmetric SD bounds (2σ low / 3σ high)", () => {
    const swings = [
      makeShot("5 Iron", 150, 155, 1.34),
      makeShot("5 Iron", 150, 155, 1.34),
      makeShot("5 Iron", 151, 156, 1.33),
      makeShot("5 Iron", 149, 154, 1.31),
      makeShot("5 Iron", 150, 155, 1.35),
      makeShot("5 Iron", 165, 170, 1.36),
    ];

    const symmetric = filterShotsByQuality(swings, "symmetric");
    const asymmetric = filterShotsByQuality(swings, "asymmetric");

    expect(
      symmetric.some((shot) => shot["Carry Distance"] === 165),
    ).toBeFalsy();
    expect(
      asymmetric.some((shot) => shot["Carry Distance"] === 165),
    ).toBeTruthy();
  });

  test("does not apply iron smash floor to wedges", () => {
    const swings = [
      makeShot("Pitching Wedge", 110, 115, 1.1),
      makeShot("7 Iron", 155, 160, 1.1),
      makeShot("7 Iron", 156, 161, 1.34),
    ];

    const filtered = filterShotsByQuality(swings, "asymmetric");
    const clubs = filtered.map((shot) => shot["Club Type"]);

    expect(clubs).toContain("Pitching Wedge");
    expect(filtered.some((shot) => shot["Club Type"] === "7 Iron")).toBe(true);
    expect(
      filtered.some(
        (shot) =>
          shot["Club Type"] === "7 Iron" && shot["Smash Factor"] === 1.1,
      ),
    ).toBe(false);
  });
});

describe("calculateAverages outlier mode precedence", () => {
  test("prioritizes shot quality when both IQR and shot quality are enabled", () => {
    const sessionSwings = [
      makeShot("Driver", 200, 200, 1.45),
      makeShot("Driver", 201, 201, 1.46),
      makeShot("Driver", 202, 202, 1.44),
      makeShot("Driver", 260, 260, 1.47),
    ];
    const sessions = {
      s1: {
        selected: true,
        date: "2026-01-01",
        results: sessionSwings,
      },
    };

    const iqrOnly = calculateAverages(sessions, {
      ...baseSettings,
      useIQR: true,
      useShotQualityFilter: false,
    });
    const bothEnabled = calculateAverages(sessions, {
      ...baseSettings,
      useIQR: true,
      useShotQualityFilter: true,
    });

    expect(iqrOnly.find((club) => club.name === "Driver")?.count).toBe(3);
    expect(bothEnabled.find((club) => club.name === "Driver")?.count).toBe(4);
  });
});
