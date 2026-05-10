import { describe, expect, it } from "vitest";
import type { AIAnalysisResult } from "../schema/aiReport";
import {
  applyRecommendationGuardrails,
  evaluateDriverFacePrescriptionGuardrail,
  sampleTierForCount,
} from "./recommendationGuardrails";
import { aggregateShots } from "./aggregate";

function minimalAnalysis(): AIAnalysisResult {
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
    practiceRecommendations: {
      highPriorityFocus: "Feel a slightly closed face on the driver.",
      drills: [
        {
          name: "Driver feel",
          purpose: "Close the face slightly through impact.",
          steps: ["Close the face at impact"],
          successMetrics: [],
          difficulty: "beginner",
        },
      ],
    },
    statistics: {
      consistencyMetrics: {
        ballSpeedConsistency: 50,
        launchAngleConsistency: 50,
        spinRateConsistency: 50,
        dispersionPattern: {
          averageOffline: 10,
          dispersionEllipse: { width: 40, length: 50 },
        },
      },
      commonIssues: [{ issue: "Example", tag: "mechanics" }],
      trends: {
        distanceTrend: "stable",
        accuracyTrend: "stable",
        consistencyTrend: "stable",
      },
    },
  };
}

describe("sampleTierForCount", () => {
  it("gates prescriptive recommendations at 25+", () => {
    expect(sampleTierForCount(30)).toBe("prescriptive");
    expect(sampleTierForCount(15)).toBe("directional");
    expect(sampleTierForCount(5)).toBe("report_only");
  });
});

describe("evaluateDriverFacePrescriptionGuardrail", () => {
  const outdoor = {
    environmentBySessionFile: { "s.csv": "outdoor" as const },
  };

  it("blocks closed-face prescription when dominant miss is left", () => {
    const shots = Array.from({ length: 12 }, (_, i) => ({
      Date: `2026-05-04 11:${String(i).padStart(2, "0")}:00`,
      __r10SessionFile: "s.csv",
      "Club Type": "Driver",
      "Carry Distance": 220,
      "Total Distance": 240,
      "Ball Speed": 150,
      "Club Speed": 100,
      "Smash Factor": 1.48,
      "Launch Angle": 12,
      "Launch Direction": -2,
      "Spin Rate": 2500,
      Backspin: 2400,
      "Club Face": -2,
      "Club Path": -1,
      "Face to Path": -1,
      "Attack Angle": 2,
      "Total Deviation Distance": -15,
    }));
    const agg = aggregateShots(
      shots,
      { timeframe: "t", filename: "f.csv" },
      outdoor,
    );
    const r = evaluateDriverFacePrescriptionGuardrail(agg, [
      "Feel a slightly closed face",
    ]);
    expect(r.driverDominantMiss).toBe("left");
    expect(r.blockedPrescriptions.length).toBeGreaterThan(0);
  });
});

describe("applyRecommendationGuardrails", () => {
  const outdoor = {
    environmentBySessionFile: { "s.csv": "outdoor" as const },
  };

  it("removes drills when sample tier is report_only", () => {
    const shots = Array.from({ length: 5 }, (_, i) => ({
      Date: `2026-05-04 12:0${i}:00`,
      __r10SessionFile: "s.csv",
      "Club Type": "Driver",
      "Carry Distance": 220,
      "Total Distance": 240,
      "Ball Speed": 150,
      "Club Speed": 100,
      "Smash Factor": 1.48,
      "Launch Angle": 12,
      "Launch Direction": 0,
      "Spin Rate": 2500,
      Backspin: 2400,
      "Club Face": 0,
      "Club Path": 0,
      "Face to Path": 0,
      "Attack Angle": 2,
      "Total Deviation Distance": 2,
    }));
    const agg = aggregateShots(
      shots,
      { timeframe: "t", filename: "f.csv" },
      outdoor,
    );
    const { analysis } = applyRecommendationGuardrails({
      aggregate: agg,
      analysis: minimalAnalysis(),
    });
    expect(analysis.practiceRecommendations.drills.length).toBe(0);
  });
});
