import { useEffect, useMemo, useState } from "react";
import { useSelectedSessionsWithSettings } from "../../hooks/useSelectedSessions";
import { useSettings } from "../../provider/SettingsContext";
import {
  GolfSwingData,
  golfSwingDataKeysInMeters,
  nonNumericGolfSwingDataKeys,
} from "../../types/GolfSwingData";
import { getDayFromRow } from "../../utils/date.utils";
import { getAllDataFromSession } from "../../utils/getAllDataFromSession";
import { parseDate } from "../../utils/utils";
import { BaseListbox } from "../base/BaseListbox.tsx";
import { PointWithDate } from "../base/chartOptions.ts";
import { RangeBallBadge } from "../RangeBallBadge.tsx";
import { ShotScatterPlotGraph } from "./graphs/ShotScatterPlotGraph.tsx";

export const ShotScatterPlot = () => {
  const { settings } = useSettings();
  const sessions = useSelectedSessionsWithSettings();

  const [xField, setXField] = useState<keyof GolfSwingData>("Carry Distance");
  const [yField, setYField] = useState<keyof GolfSwingData>("Total Distance");

  const fields: (keyof GolfSwingData)[] = useMemo(() => {
    if (!sessions) return [];

    const allData = getAllDataFromSession(sessions);
    if (allData.length === 0) return [];

    const allKeys = new Set<string>();
    allData.forEach((row) => {
      Object.keys(row).forEach((key) => allKeys.add(key));
    });

    return Array.from(allKeys)
      .filter(
        (field) =>
          !nonNumericGolfSwingDataKeys.includes(field as keyof GolfSwingData),
      )
      .filter((field) =>
        allData.some((row) => {
          const value = row[field as keyof GolfSwingData];
          return typeof value === "number" && Number.isFinite(value);
        }),
      )
      .sort((a, b) => a.localeCompare(b)) as (keyof GolfSwingData)[];
  }, [sessions]);

  useEffect(() => {
    if (fields.length > 0) {
      const preferredXFields = [
        "Carry Distance",
        "Carry-Distanz",
        "Dist.​vuelo",
        "Carry-afstand",
      ] as (keyof GolfSwingData)[];
      const preferredYFields = [
        "Total Distance",
        "Gesamtstrecke",
        "Distan​cia total",
        "Totale afstand",
      ] as (keyof GolfSwingData)[];

      const nextXField =
        preferredXFields.find((field) => fields.includes(field)) || fields[0];
      const nextYField =
        preferredYFields.find((field) => fields.includes(field)) ||
        fields.find((field) => field !== nextXField) ||
        fields[0];

      setXField(nextXField);
      setYField(nextYField);
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

  const scatterShowsDistance =
    settings.applyRangeBallCompensation &&
    (golfSwingDataKeysInMeters.includes(
      xField as (typeof golfSwingDataKeysInMeters)[number],
    ) ||
      golfSwingDataKeysInMeters.includes(
        yField as (typeof golfSwingDataKeysInMeters)[number],
      ));

  return (
    <div className="flex h-auto flex-col gap-3 rounded-xl bg-white p-4 dark:bg-gray-800">
      <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="text-xl font-bold text-gray-800 dark:text-gray-100">
            Shot Scatter Plot
          </h4>
          {scatterShowsDistance ? (
            <RangeBallBadge className="ml-0 shrink-0" />
          ) : null}
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <div className="w-full sm:w-56">
            <BaseListbox
              options={fields}
              setOption={(option) => setXField(option as keyof GolfSwingData)}
              value={xField}
              valueText={xField}
              ariaLabel="Select x-axis metric"
            />
          </div>
          <div className="w-full sm:w-56">
            <BaseListbox
              options={fields}
              setOption={(option) => setYField(option as keyof GolfSwingData)}
              value={yField}
              valueText={yField}
              ariaLabel="Select y-axis metric"
            />
          </div>
        </div>
      </div>
      <p className="mb-4 text-gray-600 dark:text-gray-400">
        Use this graph to visualize the combination of any two metrics.
        <br />
        More recent data points are colored darker. Hover over a data point to
        see the exact values.
      </p>
      <ShotScatterPlotGraph
        yField={yField}
        xField={xField}
        chartData={chartData}
      />
    </div>
  );
};
