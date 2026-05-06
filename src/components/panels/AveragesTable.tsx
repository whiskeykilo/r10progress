import { ColDef } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useContext, useMemo } from "react";
import { useDarkMode } from "../../hooks/useDarkMode";
import { SessionContext } from "../../provider/SessionContext";
import {
  AveragedSwing,
  useAveragedSwings,
} from "../../utils/calculateAverages";
import { translateHeader } from "../../utils/csvLocalization";
import { sortGolfSwingKeysForHeader } from "../../utils/utils";
import { BaseDisclosure } from "../base/BaseDisclosure";
import { BaseLabel } from "../base/BaseLabel";
const defaultColumns: ColDef<AveragedSwing>[] = [
  { field: "name", headerName: "Club", sortable: true, filter: true },
  { field: "count", headerName: "Count", sortable: true, filter: true },
];
const capitalizeFirstLetter = (s: string) => {
  return s.charAt(0).toUpperCase() + s.slice(1);
};

type AveragesTableProps = {
  hiddenColumns?: string[];
};

export const AveragesTable = ({ hiddenColumns = [] }: AveragesTableProps) => {
  const { sessions } = useContext(SessionContext);
  const { resolvedTheme } = useDarkMode();

  const averages = useAveragedSwings();

  const columnDefs: ColDef<AveragedSwing>[] = useMemo(() => {
    if (averages?.length > 0) {
      return getColumnDefinitions(averages).filter(
        (column) =>
          !!column.field && !hiddenColumns.includes(String(column.field)),
      );
    }
    return defaultColumns.filter(
      (column) =>
        !!column.field && !hiddenColumns.includes(String(column.field)),
    );
  }, [averages, hiddenColumns]);

  if (!sessions) {
    return (
      <p className="text-base text-sky-900 dark:text-sky-200">
        Select a session to display data here.
      </p>
    );
  }

  return (
    <BaseDisclosure title="Average Values">
      <div
        className={
          resolvedTheme === "dark" ? "ag-theme-quartz-dark" : "ag-theme-quartz"
        }
        style={{ display: "flex", flexDirection: "column" }}
      >
        <BaseLabel className="py-2">
          Averages for all sessions selected in the Session Picker.
        </BaseLabel>
        <div>
          <AgGridReact
            rowData={averages}
            columnDefs={columnDefs}
            domLayout="autoHeight"
          />
        </div>
      </div>
    </BaseDisclosure>
  );
};

/**
 * Get the columns for the table based on the first swing
 * @param averageSwings - An array of averaged swings
 * @returns The column definitions.
 */
const getColumnDefinitions = (averageSwings: AveragedSwing[]) => {
  const averageSwing = averageSwings[0];
  return Object.keys(averageSwing)
    .sort(sortGolfSwingKeysForHeader)
    .map((key) => ({
      field: key as keyof AveragedSwing,
      headerName: ["count", "name"].includes(key)
        ? capitalizeFirstLetter(key)
        : translateHeader(key),
      sortable: true,
      filter: true,
    }));
};
