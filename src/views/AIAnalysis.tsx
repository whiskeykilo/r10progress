import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiDelete, apiGet, apiPostAnalyze, pollAnalyzeJob } from "../api";
import { LoadingIndicator } from "../components/ai/LoadingIndicator";
import { PreviousReports } from "../components/ai/PreviousReports";
import { BaseDialog } from "../components/base/BaseDialog";
import { BasePageLayout } from "../components/base/BasePageLayout";
import { useSettings } from "../provider/SettingsContext";
import { useSelectedShots } from "../hooks/useSelectedShots";
import { SessionContext } from "../provider/SessionContext";
import { routes } from "../routes";
import { aiReportExample, AnalysisReport } from "../utils/aiReportExample";
import {
  dismissAiExampleReport,
  isAiExampleReportDismissed,
} from "../utils/aiReportExamplePreference";
import { applyRangeBallCompensationToShots } from "../utils/rangeBallCompensation";
import { parseDate } from "../utils/utils";
import dayjs from "dayjs";

/** Must match `SESSION_FILE_META_KEY` on the server aggregator. */
const R10_SESSION_FILE = "__r10SessionFile";

interface LoadingState {
  analyzing: boolean;
  generatingReport: boolean;
}

const ANALYSIS_SCOPE_VALUES = [
  "sessions-1",
  "sessions-3",
  "sessions-5",
  "sessions-7",
  "months-1",
  "months-2",
  "months-3",
  "all-selected",
] as const;

type AnalysisScope = (typeof ANALYSIS_SCOPE_VALUES)[number];

const ANALYSIS_SCOPE_LABELS: Record<AnalysisScope, string> = {
  "sessions-1": "Last 1 session",
  "sessions-3": "Last 3 sessions",
  "sessions-5": "Last 5 sessions",
  "sessions-7": "Last 7 sessions",
  "months-1": "Last 1 month",
  "months-2": "Last 2 months",
  "months-3": "Last 3 months",
  "all-selected": "All selected sessions",
};

function isAnalysisScope(value: string): value is AnalysisScope {
  return (ANALYSIS_SCOPE_VALUES as readonly string[]).includes(value);
}

function sessionCalendarDay(session: { date: string }): dayjs.Dayjs | null {
  const raw = (session.date ?? "").trim();
  if (!raw) return null;
  const iso = parseDate(raw);
  if (!iso || iso === "Invalid Date") return null;
  let d = dayjs(iso, "YYYY-MM-DD", true);
  if (!d.isValid()) d = dayjs(iso);
  return d.isValid() ? d.startOf("day") : null;
}

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
  const [analysisScope, setAnalysisScope] = useState<AnalysisScope>("months-3");
  const [confirmAnalyzeOpen, setConfirmAnalyzeOpen] = useState(false);

  useEffect(() => {
    if (!loadingState.generatingReport && !loadingState.analyzing) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [loadingState.analyzing, loadingState.generatingReport]);

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

  const runAnalyzeAfterConfirm = async () => {
    const selectedSessionEntries = Object.entries(sessions).filter(
      ([, session]) => session.selected,
    );
    const sortedEntries = [...selectedSessionEntries].sort((a, b) => {
      const da = sessionCalendarDay(a[1]);
      const db = sessionCalendarDay(b[1]);
      if (da && db) return db.valueOf() - da.valueOf();
      if (da && !db) return -1;
      if (!da && db) return 1;
      return a[0].localeCompare(b[0]);
    });

    let filteredEntries = sortedEntries;
    if (analysisScope.startsWith("sessions-")) {
      const n = Number.parseInt(analysisScope.slice("sessions-".length), 10);
      if (Number.isFinite(n) && n > 0) {
        filteredEntries = sortedEntries.slice(0, n);
      }
    } else if (analysisScope.startsWith("months-")) {
      const n = Number.parseInt(analysisScope.slice("months-".length), 10);
      if (Number.isFinite(n) && n > 0) {
        const cutoff = dayjs().subtract(n, "month").startOf("day");
        filteredEntries = sortedEntries.filter(([, session]) => {
          const d = sessionCalendarDay(session);
          return d != null && !d.isBefore(cutoff, "day");
        });
      }
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

    setLoadingState({ analyzing: false, generatingReport: true });
    setError(null);

    try {
      const filename = selectedFiles.join(", ");

      const payload = {
        shots: analysisShots,
        timeframe,
        filename,
        sessionNotes,
        environmentBySessionFile,
        playerProfile: {
          handicapIndex: settings.playerProfile?.handicapIndex ?? null,
          clubLoftsByName: settings.playerProfile?.clubLoftsByName ?? {},
        },
      };

      const submitted = await apiPostAnalyze(payload);
      const report =
        submitted.outcome === "complete"
          ? submitted.report
          : await pollAnalyzeJob(submitted.jobId);

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
      const stripped = msg
        .replace(/^POST \/api\/analyze failed: \d+(:\s*)?/, "")
        .trim();
      setError(
        msg.includes("OPENAI_API_KEY") || stripped.includes("OPENAI_API_KEY")
          ? "AI analysis is not configured. Set OPENAI_API_KEY on the server."
          : stripped.length > 0 && stripped.length < 400
            ? stripped
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
              <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800/60 dark:bg-yellow-950/35">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-100">
                      No shots selected
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-200/90">
                      <p>
                        Please select the sessions you want to receive AI
                        analysis for.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : error ? (
              <div className="rounded-md border border-red-200 bg-red-50 p-4 dark:border-red-800/60 dark:bg-red-950/40">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                      Error
                    </h3>
                    <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                      <p>{error}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : loadingState.analyzing ||
              loadingState.generatingReport ? null : (
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
                      onChange={(e) => {
                        const v = e.target.value;
                        if (isAnalysisScope(v)) setAnalysisScope(v);
                      }}
                      className="app-focus-ring mt-1 block w-full max-w-md sm:w-96"
                    >
                      <optgroup label="Recent sessions (newest first)">
                        <option value="sessions-1">
                          {ANALYSIS_SCOPE_LABELS["sessions-1"]}
                        </option>
                        <option value="sessions-3">
                          {ANALYSIS_SCOPE_LABELS["sessions-3"]}
                        </option>
                        <option value="sessions-5">
                          {ANALYSIS_SCOPE_LABELS["sessions-5"]}
                        </option>
                        <option value="sessions-7">
                          {ANALYSIS_SCOPE_LABELS["sessions-7"]}
                        </option>
                      </optgroup>
                      <optgroup label="Time window">
                        <option value="months-1">
                          {ANALYSIS_SCOPE_LABELS["months-1"]}
                        </option>
                        <option value="months-2">
                          {ANALYSIS_SCOPE_LABELS["months-2"]}
                        </option>
                        <option value="months-3">
                          {ANALYSIS_SCOPE_LABELS["months-3"]}
                        </option>
                      </optgroup>
                      <option value="all-selected">
                        {ANALYSIS_SCOPE_LABELS["all-selected"]}
                      </option>
                    </select>
                  </div>
                  <button
                    type="button"
                    className="app-focus-ring inline-flex items-center rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
                    onClick={() => setConfirmAnalyzeOpen(true)}
                  >
                    Analyze My Shots
                  </button>
                </div>
              </div>
            )}
          </div>

          <BaseDialog
            open={confirmAnalyzeOpen}
            onClose={() => setConfirmAnalyzeOpen(false)}
            title="Start AI analysis?"
          >
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Analysis uses a frontier model and can take several minutes. Do
              not close the tab or navigate away while it runs.
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <button
                type="button"
                className="app-focus-ring inline-flex justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-white dark:ring-gray-600 dark:hover:bg-gray-600"
                onClick={() => setConfirmAnalyzeOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="app-focus-ring inline-flex justify-center rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                onClick={() => {
                  setConfirmAnalyzeOpen(false);
                  void runAnalyzeAfterConfirm();
                }}
              >
                Start analysis
              </button>
            </div>
          </BaseDialog>

          {(loadingState.analyzing || loadingState.generatingReport) &&
            shots.length > 0 &&
            !error && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/50 p-4 dark:bg-black/60">
                <div className="app-card max-w-lg shadow-2xl">
                  <LoadingIndicator state={loadingState} />
                  <p className="mt-4 text-center text-sm font-medium text-amber-800 dark:text-amber-200">
                    Do not close this tab or navigate away until analysis
                    finishes. Leaving this page can interrupt the run.
                  </p>
                </div>
              </div>
            )}

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
