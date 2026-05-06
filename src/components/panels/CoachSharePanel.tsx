import { useContext, useMemo } from "react";
import { SessionContext } from "../../provider/SessionContext";
import { useBestShots } from "../../utils/calculateAverages";

const downloadTextFile = (
  content: string,
  filename: string,
  mimeType: string,
) => {
  const element = document.createElement("a");
  const file = new Blob([content], { type: mimeType });
  element.href = URL.createObjectURL(file);
  element.download = filename;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};

export const CoachSharePanel = () => {
  const { sessions, exportSessionsToJson } = useContext(SessionContext);
  const { averages, dispersion } = useBestShots();

  const summaryText = useMemo(() => {
    const lines = [
      `Session count: ${Object.keys(sessions).length}`,
      "Top club carry averages:",
      ...averages.slice(0, 8).map((avg) => {
        const carry =
          typeof avg["Carry Distance"] === "number" ? avg["Carry Distance"] : 0;
        const ellipse = dispersion.find(
          (entry) => entry.club === avg.name,
        )?.ellipse;
        const spread = ellipse
          ? `${ellipse.xAxis.toFixed(1)}x${ellipse.yAxis.toFixed(1)}`
          : "N/A";
        return `- ${avg.name}: ${carry.toFixed(1)} carry, dispersion ${spread}`;
      }),
    ];
    return lines.join("\n");
  }, [averages, dispersion, sessions]);

  return (
    <section className="rounded-xl bg-white p-4 dark:bg-gray-800">
      <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
        Coach Share / Export
      </h4>
      <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
        Internal export tools for sharing a clean snapshot before lessons.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => exportSessionsToJson(sessions)}
          className="app-focus-ring rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-500"
        >
          Export Sessions JSON
        </button>
        <button
          type="button"
          onClick={() =>
            downloadTextFile(
              summaryText,
              "coach-summary.txt",
              "text/plain;charset=utf-8",
            )
          }
          className="app-focus-ring rounded-md bg-gray-200 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
        >
          Export Coach Summary
        </button>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(summaryText);
            } catch (error) {
              console.error(error);
            }
          }}
          className="app-focus-ring rounded-md bg-gray-200 px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
        >
          Copy Summary
        </button>
      </div>
    </section>
  );
};
