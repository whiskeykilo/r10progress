import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet, apiPost } from "../api";
import { LoadingIndicator } from "../components/ai/LoadingIndicator";
import { PreviousReports } from "../components/ai/PreviousReports";
import { BasePageLayout } from "../components/base/BasePageLayout";
import { useSelectedShots } from "../hooks/useSelectedShots";
import { SessionContext } from "../provider/SessionContext";
import { routes } from "../routes";
import {
  AIAnalysisResult,
  aiReportExample,
  AnalysisReport,
} from "../utils/aiReportExample";

interface LoadingState {
  analyzing: boolean;
  generatingReport: boolean;
}

export const AIAnalysis = () => {
  const navigate = useNavigate();
  const shots = useSelectedShots();
  const { sessions } = useContext(SessionContext);
  const [loadingState, setLoadingState] = useState<LoadingState>({
    analyzing: false,
    generatingReport: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [previousReports, setPreviousReports] = useState<AnalysisReport[]>([]);

  const fetchReports = async () => {
    try {
      const reports = await apiGet<AnalysisReport[]>("/api/reports");
      setPreviousReports([aiReportExample, ...reports]);
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

  const handleAnalyze = async () => {
    if (shots.length === 0) {
      setError("No shots available for analysis");
      return;
    }

    setLoadingState({ analyzing: true, generatingReport: false });
    setError(null);

    try {
      setLoadingState({ analyzing: false, generatingReport: true });

      const allSessions = Object.keys(sessions);
      const selectedFiles = allSessions.filter((s) => sessions[s].selected);
      const filename = selectedFiles.join(", ");

      const report = await apiPost<
        AIAnalysisResult & { id: string; cached?: boolean }
      >("/api/analyze", { shots, timeframe: "last session", filename });

      await fetchReports();
      navigate(`${routes.aiAnalysis}/${report.id}`, {
        state: { shots, filename, cached: !!report.cached },
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

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
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
              <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
                <LoadingIndicator state={loadingState} />
              </div>
            ) : (
              <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Start Analysis
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Get detailed insights about your swing patterns and
                  consistency.
                </p>
                <button
                  className="mt-4 inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  onClick={handleAnalyze}
                >
                  Analyze My Shots
                </button>
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <PreviousReports
              reports={previousReports}
              onSelectReport={handleSelectReport}
              isSupporter={true}
            />
          </div>
        </div>
      </div>
    </BasePageLayout>
  );
};
