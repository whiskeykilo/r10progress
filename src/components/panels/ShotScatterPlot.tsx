import { useEffect, useMemo, useState } from "react";
import { useSelectedSessionsWithSettings } from "../../hooks/useSelectedSessions";
import {
  GolfSwingData,
  nonNumericGolfSwingDataKeys,
} from "../../types/GolfSwingData";
import { getDayFromRow } from "../../utils/date.utils";
import { getAllDataFromSession } from "../../utils/getAllDataFromSession";
import { parseDate } from "../../utils/utils";
import { BaseLabel } from "../base/BaseLabel.tsx";
import { BaseListbox } from "../base/BaseListbox.tsx";
import { PointWithDate } from "../base/chartOptions.ts";
import { ShotScatterPlotGraph } from "./graphs/ShotScatterPlotGraph.tsx";

export const ShotScatterPlot = () => {
  const sessions = useSelectedSessionsWithSettings();

  const [xField, setXField] = useState<keyof GolfSwingData>("Backspin");
  const [yField, setYField] = useState<keyof GolfSwingData>("Carry Distance");

  const fields: (keyof GolfSwingData)[] = useMemo(() => {
    const firstSession = Object.values(sessions || {})?.[0];
    const firstResult = firstSession?.results?.[0];
    const fields = firstResult ? Object.keys(firstResult) : [];
    const nonNumericFields = fields.filter(
      (field) =>
        !nonNumericGolfSwingDataKeys.includes(field as keyof GolfSwingData),
    );

    return nonNumericFields.sort((a, b) =>
      a.localeCompare(b),
    ) as (keyof GolfSwingData)[];
  }, [sessions]);

  useEffect(() => {
    if (fields.length > 0) {
      setXField(fields[0]);
      setYField(fields[1]);
    }
  }, [fields]);

  const chartData: PointWithDate[] = useMemo(() => {
    if (sessions) {
      const allData = getAllDataFromSession(sessions);
      return allData.map((row) => ({
        x: row[xField as keyof GolfSwingData],
        y: row[yField as keyof GolfSwingData],
        date: parseDate(getDayFromRow(row)),
      }));
    }
    return [];
  }, [sessions, xField, yField]);

  if (!chartData) return null;

  return (
    <div className="flex h-auto flex-col gap-3 rounded-xl bg-white p-4 dark:bg-gray-800">
      <h4 className="text-xl font-bold text-gray-800 dark:text-gray-100">
        Shot Scatter Plot
      </h4>
      <p className="mb-4 text-gray-600 dark:text-gray-400">
        Use this graph to visualize the combination of any two metrics.
        <br />
        More recent data points are colored darker. Hover over a data point to
        see the exact values.
      </p>
      <div className="mb-6 flex flex-col gap-2 md:flex-row">
        <div>
          <BaseLabel>Choose the fields to display</BaseLabel>
          <div className="flex flex-col gap-4 md:flex-row">
            <BaseListbox
              options={fields}
              setOption={(option) => setXField(option as keyof GolfSwingData)}
              value={xField}
              valueText={xField}
            />
            <BaseListbox
              options={fields}
              setOption={(option) => setYField(option as keyof GolfSwingData)}
              value={yField}
              valueText={yField}
            />
          </div>
        </div>
      </div>
      <ShotScatterPlotGraph
        yField={yField}
        xField={xField}
        chartData={chartData}
      />
    </div>
  );
};
