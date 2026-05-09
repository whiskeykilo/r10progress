// IMPORTANT: keep this interface in sync with the canonical Zod schema at
// server/src/schema/aiReport.ts. The two are duplicated because the server is
// CommonJS and the frontend is ESM/bundler with no shared workspace. If they
// drift, the GET /api/reports response will type-mismatch the renderer.
export interface AnalysisReport {
  id: string;
  userId: string;
  createdAt: string;
  shotCount: number;
  timeframe: string;
  filename: string;
  analysis: AIAnalysisResult;
}
export interface SgDrillPlan {
  name: string;
  focus: string;
  steps: string[];
}

export interface SgRecommendation {
  rank: number;
  category: "approach" | "offTheTee" | "aroundGreen" | "putting";
  title: string;
  rationale: string;
  estimatedSgPerRound: number;
  confidenceLabel: "high" | "medium" | "low";
  evidenceLines: string[];
  supportingMetrics: Array<{ label: string; value: string }>;
  drill: SgDrillPlan;
}

export interface SgFirstPlan {
  benchmarkVersionNote: string;
  environmentNote: string;
  handicapNote: string;
  recommendations: SgRecommendation[];
}

export interface AIAnalysisResult {
  technicalAnalysis: {
    impactConditions: {
      faceControl: {
        score: number;
        consistency: number;
        pattern: string;
        recommendation: string;
      };
      pathControl: {
        score: number;
        consistency: number;
        pattern: string;
        recommendation: string;
      };
      strikeQuality: {
        score: number;
        consistency: number;
        pattern: string;
        recommendation: string;
      };
    };
    ballFlight: {
      launchConditions: {
        score: number;
        consistency: number;
        pattern: string;
        recommendation: string;
      };
      spinControl: {
        score: number;
        consistency: number;
        pattern: string;
        recommendation: string;
      };
      dispersionControl: {
        score: number;
        consistency: number;
        pattern: string;
        recommendation: string;
      };
    };
  };
  performanceMetrics: {
    consistencyScore: number;
    accuracyScore: number;
    efficiencyScore: number;
    overallScore: number;
  };
  practiceRecommendations: {
    highPriorityFocus: string;
    drills: Array<{
      name: string;
      purpose: string;
      steps: string[];
      successMetrics: string[];
      difficulty: "beginner" | "intermediate" | "advanced";
    }>;
  };
  statistics: {
    consistencyMetrics: {
      ballSpeedConsistency: number;
      launchAngleConsistency: number;
      spinRateConsistency: number;
      dispersionPattern: {
        averageOffline: number;
        dispersionEllipse: {
          width: number;
          length: number;
        };
      };
    };
    commonIssues: string[];
    trends: {
      distanceTrend: "improving" | "declining" | "stable";
      accuracyTrend: "improving" | "declining" | "stable";
      consistencyTrend: "improving" | "declining" | "stable";
    };
  };
  /** Deterministic SG-first plan (server-computed). */
  sgFirstPlan?: SgFirstPlan;
}

export const aiReportExample: AnalysisReport = {
  id: "example",
  userId: "example",
  createdAt: new Date().toISOString(),
  shotCount: 25,
  timeframe: "Example Report",
  filename: "example.csv",
  analysis: {
    technicalAnalysis: {
      impactConditions: {
        faceControl: {
          score: 85,
          consistency: 78,
          pattern: "Consistently square face at impact",
          recommendation: "Keep up the good work on face control",
        },
        pathControl: {
          score: 72,
          consistency: 65,
          pattern: "Slight in-to-out path tendency",
          recommendation: "Work on neutralizing path for better consistency",
        },
        strikeQuality: {
          score: 80,
          consistency: 75,
          pattern: "Good center contact with occasional heel strikes",
          recommendation: "Practice with impact tape to improve consistency",
        },
      },
      ballFlight: {
        launchConditions: {
          score: 88,
          consistency: 82,
          pattern: "Optimal launch angles for driver",
          recommendation: "Maintain current launch conditions",
        },
        spinControl: {
          score: 76,
          consistency: 70,
          pattern: "Moderate spin rates with some variation",
          recommendation: "Focus on consistent attack angle",
        },
        dispersionControl: {
          score: 82,
          consistency: 77,
          pattern: "Tight dispersion with slight right bias",
          recommendation: "Work on alignment and path control",
        },
      },
    },
    performanceMetrics: {
      consistencyScore: 75,
      accuracyScore: 82,
      efficiencyScore: 78,
      overallScore: 78,
    },
    practiceRecommendations: {
      highPriorityFocus: "Path control and spin consistency",
      drills: [
        {
          name: "Path Control Drill",
          purpose: "Improve swing path consistency",
          steps: ["Setup alignment sticks", "Practice with slow motion swings"],
          successMetrics: [
            "Consistent divot pattern",
            "Ball flight starts on line",
          ],
          difficulty: "intermediate",
        },
      ],
    },
    statistics: {
      consistencyMetrics: {
        ballSpeedConsistency: 92,
        launchAngleConsistency: 88,
        spinRateConsistency: 85,
        dispersionPattern: {
          averageOffline: 12.5,
          dispersionEllipse: {
            width: 25,
            length: 45,
          },
        },
      },
      commonIssues: ["Slight path inconsistency", "Variable spin rates"],
      trends: {
        distanceTrend: "improving",
        accuracyTrend: "stable",
        consistencyTrend: "improving",
      },
    },
    sgFirstPlan: {
      benchmarkVersionNote: "Example only",
      environmentNote:
        "Outdoor-majority sample — modeled carry comparatively more trustworthy.",
      handicapNote: "Example handicap bucket ≈ low double digits.",
      recommendations: [
        {
          rank: 1,
          category: "approach",
          title: "Example: tighten mid-iron carry variance",
          rationale:
            "Illustrative SG-style ranking — replace with live server output.",
          estimatedSgPerRound: 2.4,
          confidenceLabel: "high",
          evidenceLines: [
            "7-iron carry std elevated vs typical peer band.",
            "Smash-factor stability is trending measurable on R10.",
          ],
          supportingMetrics: [{ label: "7i carry σ", value: "8 yds example" }],
          drill: {
            name: "Stock yardage ladders",
            focus: "Proximity first",
            steps: [
              "Hit 5 balls each to three numbered targets.",
              "Log offline.",
            ],
          },
        },
      ],
    },
  },
};
