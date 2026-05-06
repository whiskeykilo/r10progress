import { format } from "date-fns";
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { apiGet, apiPost } from "../api";
import { BasePageLayout } from "../components/base/BasePageLayout";
import { routes } from "../routes";
import {
  AIAnalysisResult,
  aiReportExample,
  AnalysisReport,
} from "../utils/aiReportExample";

type AnalyzeNavState = {
  shots?: Array<Record<string, unknown>>;
  filename?: string;
  cached?: boolean;
};

const ScoreIndicator = ({ score }: { score: number }) => {
  const getColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="flex items-center space-x-2">
      <div className="h-2 w-20 rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className={`h-2 rounded-full ${getColor(score)}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-sm font-medium">{score}</span>
    </div>
  );
};

const AnalysisSection = ({
  title,
  data,
}: {
  title: string;
  data: {
    score: number;
    consistency: number;
    pattern: string;
    recommendation: string;
  };
}) => (
  <div className="app-card-compact">
    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
      {title}
    </h3>
    <div className="mt-2 space-y-3">
      <div className="flex justify-between">
        <span className="text-sm text-gray-500 dark:text-gray-400">Score</span>
        <ScoreIndicator score={data.score} />
      </div>
      <div className="flex justify-between">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Consistency
        </span>
        <ScoreIndicator score={data.consistency} />
      </div>
      <div className="mt-3">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Pattern
        </h4>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {data.pattern}
        </p>
      </div>
      <div className="mt-3">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Recommendation
        </h4>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {data.recommendation}
        </p>
      </div>
    </div>
  </div>
);

const DrillCard = ({
  drill,
}: {
  drill: AIAnalysisResult["practiceRecommendations"]["drills"][0];
}) => (
  <div className="app-card-compact">
    <div className="flex items-center justify-between">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
        {drill.name}
      </h3>
      <span
        className={`rounded-full px-2 py-1 text-xs font-medium ${
          drill.difficulty === "beginner"
            ? "bg-green-100 text-green-800"
            : drill.difficulty === "intermediate"
              ? "bg-yellow-100 text-yellow-800"
              : "bg-red-100 text-red-800"
        }`}
      >
        {drill.difficulty}
      </span>
    </div>
    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
      {drill.purpose}
    </p>
    <div className="mt-4">
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Steps
      </h4>
      <ul className="mt-2 list-inside list-decimal space-y-2 text-sm text-gray-600 dark:text-gray-400">
        {drill.steps.map((step, index) => (
          <li key={index}>{step}</li>
        ))}
      </ul>
    </div>
    <div className="mt-4">
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Success Metrics
      </h4>
      <ul className="mt-2 list-inside list-disc space-y-2 text-sm text-gray-600 dark:text-gray-400">
        {drill.successMetrics.map((metric, index) => (
          <li key={index}>{metric}</li>
        ))}
      </ul>
    </div>
  </div>
);

export const AIReport = () => {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const navState = (location.state ?? {}) as AnalyzeNavState;
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  const canRegenerate = !!navState.shots && navState.shots.length > 0;
  const handleRegenerate = async () => {
    if (!canRegenerate || regenerating) return;
    setRegenerating(true);
    try {
      const fresh = await apiPost<AnalysisReport & { cached?: boolean }>(
        "/api/analyze",
        {
          shots: navState.shots,
          timeframe: "last session",
          filename: navState.filename ?? "",
          force: true,
        },
      );
      navigate(`${routes.aiAnalysis}/${fresh.id}`, {
        state: { ...navState, cached: !!fresh.cached },
        replace: true,
      });
    } catch (err) {
      console.error("Regenerate failed:", err);
      setRegenerating(false);
    }
  };

  useEffect(() => {
    if (!reportId) {
      navigate(routes.aiAnalysis);
      return;
    }

    if (reportId === "example") {
      setReport(aiReportExample);
      setLoading(false);
      return;
    }

    apiGet<AnalysisReport>(`/api/reports/${reportId}`)
      .then(setReport)
      .catch((err) => {
        console.error("Error fetching report:", err);
        setError("Failed to load report");
      })
      .finally(() => setLoading(false));
  }, [reportId, navigate]);

  if (loading) {
    return (
      <BasePageLayout>
        <div className="flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent"></div>
        </div>
      </BasePageLayout>
    );
  }

  if (error || !report) {
    return (
      <BasePageLayout>
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error || "Report not found"}</p>
              </div>
            </div>
          </div>
        </div>
      </BasePageLayout>
    );
  }

  const { analysis } = report;

  if (
    !analysis?.performanceMetrics ||
    !analysis?.technicalAnalysis?.impactConditions ||
    !analysis?.technicalAnalysis?.ballFlight ||
    !analysis?.practiceRecommendations
  ) {
    return (
      <BasePageLayout>
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Incomplete Report
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>
                  This report is missing data. The AI analysis may have been cut
                  short. Please try generating a new report.
                </p>
              </div>
              <button
                onClick={() => navigate(routes.aiAnalysis)}
                className="mt-3 rounded-md bg-red-100 px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-200"
              >
                Back to Reports
              </button>
            </div>
          </div>
        </div>
      </BasePageLayout>
    );
  }

  return (
    <BasePageLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
              AI Golf Analysis
              {navState.cached && (
                <span
                  title="Reused a previously generated report for this exact shot selection. Click Regenerate for a fresh take."
                  className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700"
                >
                  Cached
                </span>
              )}
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Analysis from {format(new Date(report.createdAt), "PPP")} •{" "}
              {report.shotCount} shots analyzed
              {report.filename && (
                <> • Files used: {report.filename.split(",").length}</>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            {canRegenerate && (
              <button
                onClick={handleRegenerate}
                disabled={regenerating}
                className="app-focus-ring disabled:bg-brand-300 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed"
              >
                {regenerating ? "Regenerating…" : "Regenerate"}
              </button>
            )}
            <button
              onClick={() => navigate(routes.aiAnalysis)}
              className="app-focus-ring rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              Back to Reports
            </button>
          </div>
        </div>

        <div className="app-card">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Performance Overview
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Overall Score
              </h3>
              <ScoreIndicator
                score={analysis.performanceMetrics.overallScore}
              />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Consistency
              </h3>
              <ScoreIndicator
                score={analysis.performanceMetrics.consistencyScore}
              />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Accuracy
              </h3>
              <ScoreIndicator
                score={analysis.performanceMetrics.accuracyScore}
              />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Efficiency
              </h3>
              <ScoreIndicator
                score={analysis.performanceMetrics.efficiencyScore}
              />
            </div>
          </div>
        </div>

        <div>
          <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
            Impact Conditions
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <AnalysisSection
              title="Face Control"
              data={analysis.technicalAnalysis.impactConditions.faceControl}
            />
            <AnalysisSection
              title="Path Control"
              data={analysis.technicalAnalysis.impactConditions.pathControl}
            />
            <AnalysisSection
              title="Strike Quality"
              data={analysis.technicalAnalysis.impactConditions.strikeQuality}
            />
          </div>
        </div>

        <div>
          <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
            Ball Flight
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <AnalysisSection
              title="Launch Conditions"
              data={analysis.technicalAnalysis.ballFlight.launchConditions}
            />
            <AnalysisSection
              title="Spin Control"
              data={analysis.technicalAnalysis.ballFlight.spinControl}
            />
            <AnalysisSection
              title="Dispersion Control"
              data={analysis.technicalAnalysis.ballFlight.dispersionControl}
            />
          </div>
        </div>

        <div>
          <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
            Practice Plan
          </h2>
          <div className="app-card">
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                High Priority Focus
              </h3>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                {analysis.practiceRecommendations.highPriorityFocus}
              </p>
            </div>
            <div className="space-y-4">
              {analysis.practiceRecommendations.drills.map((drill, index) => (
                <DrillCard key={index} drill={drill} />
              ))}
            </div>
          </div>
        </div>

        <div className="app-card">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Statistical Trends
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Distance
              </h3>
              <p className="mt-1 text-lg font-medium capitalize text-gray-900 dark:text-white">
                {analysis.statistics.trends.distanceTrend}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Accuracy
              </h3>
              <p className="mt-1 text-lg font-medium capitalize text-gray-900 dark:text-white">
                {analysis.statistics.trends.accuracyTrend}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Consistency
              </h3>
              <p className="mt-1 text-lg font-medium capitalize text-gray-900 dark:text-white">
                {analysis.statistics.trends.consistencyTrend}
              </p>
            </div>
          </div>
        </div>
      </div>
    </BasePageLayout>
  );
};
