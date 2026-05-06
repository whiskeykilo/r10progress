import { format } from "date-fns";
import { AnalysisReport } from "../../utils/aiReportExample";

interface PreviousReportsProps {
  reports: AnalysisReport[];
  onSelectReport: (report: AnalysisReport) => void;
  isSupporter: boolean;
}

export const PreviousReports = ({
  reports,
  onSelectReport,
  isSupporter,
}: PreviousReportsProps) => (
  <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
      {isSupporter ? "Previous Reports" : "Example Report"}
    </h2>
    <div className="mt-4 divide-y divide-gray-200 dark:divide-gray-700">
      {reports.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No previous reports found.
        </p>
      ) : (
        reports.map((report) => (
          <button
            key={report.id}
            type="button"
            className="flex w-full items-center justify-between rounded-md py-4 text-left hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:hover:bg-gray-700"
            onClick={() => onSelectReport(report)}
            aria-label={
              report.id === "example"
                ? "Open example report"
                : `Open report from ${format(new Date(report.createdAt), "PPP")}`
            }
          >
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {report.id === "example"
                  ? "Example Report"
                  : `Analysis from ${format(new Date(report.createdAt), "PPP")}`}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {report.shotCount} shots analyzed
              </p>
            </div>
            <svg
              className="h-5 w-5 text-gray-400 dark:text-gray-500"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        ))
      )}
    </div>
  </div>
);
