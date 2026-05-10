import { describe, expect, it } from "vitest";
import type { AIAnalysisResult } from "../schema/aiReport";
import {
  analyzeBallFlightConsistency,
  describePathDirectionRH,
} from "./ballFlightConsistency";
import { aggregateShots } from "./aggregate";

function baseAnalysis(
  overrides: Partial<AIAnalysisResult> = {},
): AIAnalysisResult {
  return {
    technicalAnalysis: {
      impactConditions: {
        faceControl: {
          score: 50,
          consistency: 50,
          pattern: "",
          recommendation: "",
        },
        pathControl: {
          score: 50,
          consistency: 50,
          pattern: "",
          recommendation: "",
        },
        strikeQuality: {
          score: 50,
          consistency: 50,
          pattern: "",
          recommendation: "",
        },
      },
      ballFlight: {
        launchConditions: {
          score: 50,
          consistency: 50,
          pattern: "",
          recommendation: "",
        },
        spinControl: {
          score: 50,
          consistency: 50,
          pattern: "",
          recommendation: "",
        },
        dispersionControl: {
          score: 50,
          consistency: 50,
          pattern: "",
          recommendation: "",
        },
      },
    },
    performanceMetrics: {
      consistencyScore: 50,
      accuracyScore: 50,
      efficiencyScore: 50,
      overallScore: 50,
    },
    practiceRecommendations: { highPriorityFocus: "", drills: [] },
    statistics: {
      consistencyMetrics: {
        ballSpeedConsistency: 50,
        launchAngleConsistency: 50,
        spinRateConsistency: 50,
        dispersionPattern: {
          averageOffline: 0,
          dispersionEllipse: { width: 0, length: 0 },
        },
      },
      commonIssues: [],
      trends: {
        distanceTrend: "stable",
        accuracyTrend: "stable",
        consistencyTrend: "stable",
      },
    },
    ...overrides,
  };
}

describe("describePathDirectionRH", () => {
  it("maps Garmin signs for right-handed golfer", () => {
    expect(describePathDirectionRH(-7)).toBe("out-to-in");
    expect(describePathDirectionRH(4)).toBe("in-to-out");
    expect(describePathDirectionRH(0)).toBe("near-neutral");
  });
});

describe("analyzeBallFlightConsistency", () => {
  const outdoor = {
    environmentBySessionFile: { "s.csv": "outdoor" as const },
  };

  const driverShot = (
    i: number,
    path: number,
    face: number,
    totalDev: number,
    ld: number,
    f2p: number,
  ) => ({
    Date: `2026-05-04 10:${String(i).padStart(2, "0")}:00`,
    __r10SessionFile: "s.csv",
    "Club Type": "Driver",
    "Carry Distance": 220,
    "Total Distance": 240,
    "Ball Speed": 150,
    "Club Speed": 100,
    "Smash Factor": 1.48,
    "Launch Angle": 12,
    "Launch Direction": ld,
    "Spin Rate": 2500,
    Backspin: 2400,
    "Club Face": face,
    "Club Path": path,
    "Face to Path": f2p,
    "Attack Angle": 2,
    "Apex Height": 28,
    "Total Deviation Distance": totalDev,
  });

  it("flags prose that labels negative path as in-to-out", () => {
    const shots = Array.from({ length: 12 }, (_, i) =>
      driverShot(i, -5, 0, i % 3 === 0 ? -12 : -8, -1, 5),
    );
    const agg = aggregateShots(
      shots,
      { timeframe: "t", filename: "f.csv" },
      outdoor,
    );
    const analysis = baseAnalysis({
      technicalAnalysis: {
        ...baseAnalysis().technicalAnalysis,
        impactConditions: {
          ...baseAnalysis().technicalAnalysis.impactConditions,
          pathControl: {
            score: 40,
            consistency: 40,
            pattern: "Average path is several degrees in-to-out.",
            recommendation: "Maintain your in-to-out delivery.",
          },
        },
      },
    });
    const c = analyzeBallFlightConsistency(agg, analysis);
    expect(c.some((x) => x.includes("Path wording mismatch"))).toBe(true);
  });
});
