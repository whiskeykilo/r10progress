import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiDelete, apiGet, apiPost } from "../api";
import { LoadingIndicator } from "../components/ai/LoadingIndicator";
import { PreviousReports } from "../components/ai/PreviousReports";
import { BasePageLayout } from "../components/base/BasePageLayout";
import { useSettings } from "../provider/SettingsContext";
import { useSelectedShots } from "../hooks/useSelectedShots";
import { SessionContext } from "../provider/SessionContext";
import { routes } from "../routes";
import {
  AIAnalysisResult,
  aiReportExample,
  AnalysisReport,
} from "../utils/aiReportExample";
import {
  dismissAiExampleReport,
  isAiExampleReportDismissed,
} from "../utils/aiReportExamplePreference";
import { applyRangeBallCompensationToShots } from "../utils/rangeBallCompensation";

/** Must match `SESSION_FILE_META_KEY` on the server aggregator. */
const R10_SESSION_FILE = "__r10SessionFile";

interface LoadingState {
  analyzing: boolean;
  generatingReport: boolean;
}

type AnalysisScope = "all-selected" | "last-3-months" | "last-10-sessions";

const ANALYSIS_SCOPE_LABELS: Record<AnalysisScope, string> = {
  "all-selected": "All selected sessions",
  "last-3-months": "Last 3 months",
  "last-10-sessions": "Last 10 sessions",
};

export const AIAnalysis = () => {
  const navigate = useNavigate();
  const shots = useSelectedShots();
  const { sessions } = useContext(SessionContext);
  const { settings } = useSettings();
  const [loadingState, setLoadingState] = useState<LoadingState>({
    analyzing: false,
    generatingReport: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [previousReports, setPreviousReports] = useState<AnalysisReport[]>([]);
  const [analysisScope, setAnalysisScope] =
    useState<AnalysisScope>("last-3-months");

  const fetchReports = async () => {
    try {
      const reports = await apiGet<AnalysisReport[]>("/api/reports");
      setPreviousReports(
        isAiExampleReportDismissed() ? reports : [aiReportExample, ...reports],
      );
    } catch (err) {
      console.error("Error fetching reports:", err);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleSelectReport = (report: AnalysisReport) => {
    navigate(`${routes.aiAnalysis}/${report.id}`);
  };

  const handleDeleteReport = async (report: AnalysisReport) => {
    const reportLabel =
      report.id === "example"
        ? "the example report"
        : `the report from ${new Date(report.createdAt).toLocaleDateString()}`;
    const confirmed = window.confirm(`Delete ${reportLabel}?`);
    if (!confirmed) return;

    if (report.id === "example") {
      dismissAiExampleReport();
      setPreviousReports((current) =>
        current.filter((r) => r.id !== report.id),
      );
      return;
    }

    try {
      await apiDelete(`/api/reports/${report.id}`);
      setPreviousReports((current) =>
        current.filter((r) => r.id !== report.id),
      );
    } catch (err) {
      console.error("Error deleting report:", err);
      setError("Failed to delete report. Please try again.");
    }
  };

  const handleAnalyze = async () => {
    const selectedSessionEntries = Object.entries(sessions).filter(
      ([, session]) => session.selected,
    );
    const sortedEntries = [...selectedSessionEntries].sort((a, b) => {
      const dateA = new Date(a[1].date).getTime();
      const dateB = new Date(b[1].date).getTime();
      return dateB - dateA;
    });

    let filteredEntries = sortedEntries;
    if (analysisScope === "last-10-sessions") {
      filteredEntries = sortedEntries.slice(0, 10);
    } else if (analysisScope === "last-3-months") {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      filteredEntries = sortedEntries.filter(
        ([, session]) => new Date(session.date) >= threeMonthsAgo,
      );
    }

    const environmentBySessionFile: Record<
      string,
      "indoor" | "outdoor" | "unknown"
    > = {};
    const analysisShots = filteredEntries.flatMap(([fname, session]) => {
      environmentBySessionFile[fname] = session.environment ?? "unknown";
      return applyRangeBallCompensationToShots(session.results, settings).map(
        (row) => ({
          ...row,
          [R10_SESSION_FILE]: fname,
        }),
      );
    });
    const selectedFiles = filteredEntries.map(([filename]) => filename);
    const sessionNotes = filteredEntries
      .map(([fname, session]) => ({
        filename: fname,
        notes: (session.notes ?? "").trim(),
      }))
      .filter((s) => s.notes.length > 0);
    const timeframe = ANALYSIS_SCOPE_LABELS[analysisScope];

    if (analysisShots.length === 0) {
      setError("No shots available for analysis");
      return;
    }

    setLoadingState({ analyzing: true, generatingReport: false });
    setError(null);

    try {
      setLoadingState({ analyzing: false, generatingReport: true });
      const filename = selectedFiles.join(", ");

      const report = await apiPost<
        AIAnalysisResult & { id: string; cached?: boolean }
      >("/api/analyze", {
        shots: analysisShots,
        timeframe,
        filename,
        sessionNotes,
        environmentBySessionFile,
        playerProfile: {
          handicapIndex: settings.playerProfile?.handicapIndex ?? null,
          clubLoftsByName: settings.playerProfile?.clubLoftsByName ?? {},
        },
      });

      await fetchReports();
      navigate(`${routes.aiAnalysis}/${report.id}`, {
        state: {
          shots: analysisShots,
          filename,
          cached: !!report.cached,
          timeframe,
          sessionNotes,
          environmentBySessionFile,
          playerProfile: {
            handicapIndex: settings.playerProfile?.handicapIndex ?? null,
            clubLoftsByName: settings.playerProfile?.clubLoftsByName ?? {},
          },
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(
        msg.includes("OPENAI_API_KEY")
          ? "AI analysis is not configured. Set OPENAI_API_KEY on the server."
          : "Failed to analyze shots. Please try again later.",
      );
      console.error("Analysis error:", err);
    } finally {
      setLoadingState({ analyzing: false, generatingReport: false });
    }
  };

  return (
    <BasePageLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            AI Golf Analysis
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Get personalized insights and recommendations for your golf game
            using advanced AI analysis.
          </p>
        </div>

        <div className="flex flex-col gap-8">
          <div>
            {shots.length === 0 ? (
              <div className="rounded-md bg-yellow-50 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      No shots selected
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>
                        Please select the sessions you want to receive AI
                        analysis for.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : error ? (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{error}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : loadingState.analyzing || loadingState.generatingReport ? (
              <div className="app-card">
                <LoadingIndicator state={loadingState} />
              </div>
            ) : (
              <div className="app-card">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Start Analysis
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Get detailed insights about your swing patterns and
                  consistency.
                </p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div>
                    <label
                      htmlFor="analysis-scope"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Analysis scope
                    </label>
                    <select
                      id="analysis-scope"
                      value={analysisScope}
                      onChange={(e) =>
                        setAnalysisScope(e.target.value as AnalysisScope)
                      }
                      className="app-focus-ring mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 sm:w-80"
                    >
                      <option value="last-3-months">Last 3 months</option>
                      <option value="last-10-sessions">Last 10 sessions</option>
                      <option value="all-selected">
                        All selected sessions
                      </option>
                    </select>
                  </div>
                  <button
                    className="app-focus-ring inline-flex items-center rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
                    onClick={handleAnalyze}
                  >
                    Analyze My Shots
                  </button>
                </div>
              </div>
            )}
          </div>

          <div>
            <PreviousReports
              reports={previousReports}
              onSelectReport={handleSelectReport}
              onDeleteReport={handleDeleteReport}
              isSupporter={true}
            />
          </div>
        </div>
      </div>
    </BasePageLayout>
  );
};
