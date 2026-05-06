import { useContext, useEffect, useMemo, useState } from "react";
import { BasePageLayout } from "../components/base/BasePageLayout";
import { AllDataCombinedTable } from "../components/panels/AllDataCombinedTable";
import { AveragesTable } from "../components/panels/AveragesTable";
import { SessionContext } from "../provider/SessionContext";
import { getAllDataFromSession } from "../utils/getAllDataFromSession";
import { useAveragedSwings } from "../utils/calculateAverages";
import { sortGolfSwingKeysForHeader } from "../utils/utils";

export const Sessions = () => {
  const { sessions } = useContext(SessionContext);
  const averages = useAveragedSwings();
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);

  const availableColumns = useMemo(() => {
    const allData = sessions ? getAllDataFromSession(sessions) : [];
    const allDataKeys = Object.keys(allData[0] || {});
    const averageKeys = Object.keys(averages?.[0] || {});

    return Array.from(new Set([...allDataKeys, ...averageKeys])).sort(
      sortGolfSwingKeysForHeader,
    );
  }, [sessions, averages]);

  useEffect(() => {
    setHiddenColumns((previous) =>
      previous.filter((column) => availableColumns.includes(column)),
    );
  }, [availableColumns]);

  const toggleColumn = (column: string) => {
    setHiddenColumns((previous) =>
      previous.includes(column)
        ? previous.filter((value) => value !== column)
        : [...previous, column],
    );
  };

  return (
    <BasePageLayout title="Sessions">
      {availableColumns.length > 0 && (
        <details className="rounded-md border border-sky-200 bg-white p-3 dark:border-sky-900 dark:bg-gray-900">
          <summary className="cursor-pointer text-sm font-medium text-sky-900 dark:text-sky-100">
            Visible Columns
          </summary>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {availableColumns.map((column) => {
              const visible = !hiddenColumns.includes(column);
              return (
                <label
                  key={column}
                  className="flex items-center gap-2 text-sm text-sky-900 dark:text-sky-100"
                >
                  <input
                    type="checkbox"
                    checked={visible}
                    onChange={() => toggleColumn(column)}
                    className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                  />
                  <span>{column}</span>
                </label>
              );
            })}
          </div>
        </details>
      )}
      <AveragesTable hiddenColumns={hiddenColumns} />
      <AllDataCombinedTable hiddenColumns={hiddenColumns} />
    </BasePageLayout>
  );
};
