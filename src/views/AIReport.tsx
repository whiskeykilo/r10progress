import { format } from "date-fns";
import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { apiGet, apiPost } from "../api";
import { BaseDialog } from "../components/base/BaseDialog";
import { BasePageLayout } from "../components/base/BasePageLayout";
import { routes } from "../routes";
import { GoalForm } from "./GoalForm";
import {
  AIAnalysisResult,
  aiReportExample,
  AnalysisReport,
} from "../utils/aiReportExample";
import { isAiExampleReportDismissed } from "../utils/aiReportExamplePreference";

type AnalyzeNavState = {
  shots?: Array<Record<string, unknown>>;
  filename?: string;
  cached?: boolean;
  timeframe?: string;
  sessionNotes?: Array<{ filename: string; notes: string }>;
  environmentBySessionFile?: Record<string, "indoor" | "outdoor" | "unknown">;
  playerProfile?: {
    handicapIndex: number | null;
    clubLoftsByName: Record<string, number>;
  };
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
  onCreateGoal,
}: {
  title: string;
  data: {
    score: number;
    consistency: number;
    pattern: string;
    recommendation: string;
  };
  onCreateGoal: (title: string) => void;
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
      <div className="flex justify-between">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Recommendation Confidence
        </span>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {data.consistency >= 80
            ? "High"
            : data.consistency >= 60
              ? "Medium"
              : "Low"}
        </span>
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
        <button
          type="button"
          onClick={() => onCreateGoal(data.recommendation)}
          className="app-focus-ring mt-2 inline-flex items-center rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
        >
          Create Goal from Recommendation
        </button>
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
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [goalSuggestion, setGoalSuggestion] = useState("");

  const canRegenerate = !!navState.shots && navState.shots.length > 0;
  const handleCreateGoal = (suggestion: string) => {
    setGoalSuggestion(suggestion);
    setGoalDialogOpen(true);
  };
  const handleRegenerate = async () => {
    if (!canRegenerate || regenerating) return;
    setRegenerating(true);
    try {
      const fresh = await apiPost<
        AIAnalysisResult & { id: string; cached?: boolean }
      >("/api/analyze", {
        shots: navState.shots ?? [],
        timeframe: navState.timeframe ?? report?.timeframe ?? "Last 3 months",
        filename: navState.filename ?? "",
        sessionNotes: navState.sessionNotes ?? [],
        environmentBySessionFile: navState.environmentBySessionFile,
        playerProfile: navState.playerProfile,
        force: true,
      });
      navigate(`${routes.aiAnalysis}/${fresh.id}`, {
        state: { ...navState, cached: !!fresh.cached },
        replace: true,
      });
    } catch (err) {
      console.error("Regenerate failed:", err);
    } finally {
      setRegenerating(false);
    }
  };

  useEffect(() => {
    if (!reportId) {
      navigate(routes.aiAnalysis);
      return;
    }

    if (reportId === "example") {
      if (isAiExampleReportDismissed()) {
        navigate(routes.aiAnalysis, { replace: true });
        return;
      }
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

        {analysis.sgFirstPlan ? (
          <div className="app-card border-l-4 border-brand-600">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Strokes Gained priority plan
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Deterministic ranking from your aggregates vs peer baselines in{" "}
              <code className="rounded bg-gray-100 px-1 text-xs dark:bg-gray-800">
                KNOWLEDGE.md
              </code>
              . Estimates are approximate strokes/round if the gap were fully
              recovered.
            </p>
            <div className="mt-3 grid gap-3 text-xs text-gray-600 dark:text-gray-400 sm:grid-cols-2">
              <p>{analysis.sgFirstPlan.environmentNote}</p>
              <p>{analysis.sgFirstPlan.handicapNote}</p>
            </div>
            <p className="mt-2 text-xs italic text-gray-500 dark:text-gray-500">
              {analysis.sgFirstPlan.benchmarkVersionNote}
            </p>
            <ol className="mt-6 space-y-6">
              {analysis.sgFirstPlan.recommendations.map((rec) => (
                <li
                  key={rec.rank}
                  className="rounded-lg bg-gray-50 p-4 dark:bg-gray-800/60"
                >
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-lg font-bold text-brand-600">
                      #{rec.rank}
                    </span>
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-gray-600 ring-1 ring-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:ring-gray-600">
                      {rec.category}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        rec.confidenceLabel === "high"
                          ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200"
                          : rec.confidenceLabel === "medium"
                            ? "bg-yellow-100 text-yellow-900 dark:bg-yellow-900/30 dark:text-yellow-100"
                            : "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200"
                      }`}
                    >
                      Confidence: {rec.confidenceLabel}
                    </span>
                    <span className="ml-auto text-sm font-semibold text-gray-900 dark:text-white">
                      ~{rec.estimatedSgPerRound.toFixed(2)} SG / round
                    </span>
                  </div>
                  <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">
                    {rec.title}
                  </h3>
                  <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                    {rec.rationale}
                  </p>
                  {rec.evidenceLines.length > 0 && (
                    <ul className="mt-2 list-inside list-disc text-sm text-gray-600 dark:text-gray-400">
                      {rec.evidenceLines.map((line, i) => (
                        <li key={i}>{line}</li>
                      ))}
                    </ul>
                  )}
                  {rec.supportingMetrics.length > 0 && (
                    <dl className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
                      {rec.supportingMetrics.map((m) => (
                        <div key={m.label}>
                          <dt className="text-gray-500 dark:text-gray-400">
                            {m.label}
                          </dt>
                          <dd className="font-medium text-gray-900 dark:text-gray-100">
                            {m.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  <div className="mt-4 rounded-md border border-gray-200 p-3 dark:border-gray-600">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      Drill: {rec.drill.name}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {rec.drill.focus}
                    </p>
                    <ol className="mt-2 list-inside list-decimal text-sm text-gray-700 dark:text-gray-300">
                      {rec.drill.steps.map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ol>
                    <button
                      type="button"
                      onClick={() =>
                        handleCreateGoal(
                          `${rec.drill.name}: ${rec.drill.steps[0] ?? rec.drill.focus}`,
                        )
                      }
                      className="app-focus-ring mt-3 inline-flex rounded-md bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-700"
                    >
                      Create goal from drill
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <div className="rounded-md bg-amber-50 p-4 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
            No SG-first plan bundled with this report (legacy cache). Generate a
            new analysis to populate Strokes-Gained-ranked recommendations.
          </div>
        )}

        <div>
          <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
            Impact Conditions
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <AnalysisSection
              title="Face Control"
              data={analysis.technicalAnalysis.impactConditions.faceControl}
              onCreateGoal={handleCreateGoal}
            />
            <AnalysisSection
              title="Path Control"
              data={analysis.technicalAnalysis.impactConditions.pathControl}
              onCreateGoal={handleCreateGoal}
            />
            <AnalysisSection
              title="Strike Quality"
              data={analysis.technicalAnalysis.impactConditions.strikeQuality}
              onCreateGoal={handleCreateGoal}
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
              onCreateGoal={handleCreateGoal}
            />
            <AnalysisSection
              title="Spin Control"
              data={analysis.technicalAnalysis.ballFlight.spinControl}
              onCreateGoal={handleCreateGoal}
            />
            <AnalysisSection
              title="Dispersion Control"
              data={analysis.technicalAnalysis.ballFlight.dispersionControl}
              onCreateGoal={handleCreateGoal}
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
      <BaseDialog
        open={goalDialogOpen}
        onClose={() => setGoalDialogOpen(false)}
        title="Create Goal from AI Recommendation"
      >
        <GoalForm
          initialTitle={goalSuggestion}
          closeAction={() => setGoalDialogOpen(false)}
        />
      </BaseDialog>
    </BasePageLayout>
  );
};
