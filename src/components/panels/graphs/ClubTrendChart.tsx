import * as echarts from "echarts";
import { useEffect, useMemo, useState } from "react";
import { useUnit } from "../../../hooks/useUnit";
import { useSelectedSessionsWithSettings } from "../../../hooks/useSelectedSessions";
import {
  getCarryDeviationDistance,
  getCarryDistance,
  getClubName,
} from "../../../utils/golfSwingData.helpers";
import { parseDate } from "../../../utils/utils";
import { BaseGraph } from "../../base/BaseGraph";
import { chartOptionsGrid } from "../../base/chartOptions";
import { BaseLabel } from "../../base/BaseLabel";
import { BaseListbox } from "../../base/BaseListbox";
import { RangeBallBadge } from "../../RangeBallBadge";

type ClubSessionStat = {
  /** Stable id (filename from session list) */
  sessionKey: string;
  /** ISO-ish sort key from session date */
  dateSortKey: string;
  /** X-axis label (unique when same display name appears twice) */
  chartLabel: string;
  carryAvg: number;
  /** Mean offline distance at carry; null when no deviation values in session */
  dispersionAvg: number | null;
  shotCount: number;
};

export const ClubTrendChart = () => {
  const unit = useUnit();
  const sessions = useSelectedSessionsWithSettings();
  const [selectedClub, setSelectedClub] = useState("");

  const clubOptions = useMemo(
    () =>
      Array.from(
        new Set(
          Object.values(sessions).flatMap((session) =>
            session.results
              .map((shot) => getClubName(shot))
              .filter(Boolean)
              .map((club) => String(club)),
          ),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [sessions],
  );

  useEffect(() => {
    if (!clubOptions.length) {
      setSelectedClub("");
      return;
    }
    setSelectedClub((current) =>
      clubOptions.includes(current) ? current : clubOptions[0],
    );
  }, [clubOptions]);

  const trendData = useMemo<ClubSessionStat[]>(() => {
    if (!selectedClub) return [];

    const rows = Object.entries(sessions)
      .map(([sessionKey, session]) => {
        const swings = session.results.filter(
          (shot) => String(getClubName(shot) ?? "") === selectedClub,
        );
        const carries = swings
          .map((shot) => getCarryDistance(shot))
          .filter(
            (value): value is number =>
              typeof value === "number" && Number.isFinite(value),
          );
        if (!carries.length) return null;

        const carryAvg =
          carries.reduce((sum, value) => sum + value, 0) / carries.length;
        const deviations = swings
          .map((shot) => getCarryDeviationDistance(shot))
          .filter(
            (value): value is number =>
              typeof value === "number" && Number.isFinite(value),
          );
        const dispersionAvg = deviations.length
          ? deviations.reduce((sum, value) => sum + value, 0) /
            deviations.length
          : null;

        const baseLabel =
          session.displayName?.trim() || parseDate(session.date);

        return {
          sessionKey,
          dateSortKey: parseDate(session.date),
          chartLabel: baseLabel,
          carryAvg: Number(carryAvg.toFixed(2)),
          dispersionAvg:
            dispersionAvg !== null ? Number(dispersionAvg.toFixed(2)) : null,
          shotCount: carries.length,
        };
      })
      .filter((value): value is ClubSessionStat => value !== null)
      .sort(
        (a, b) =>
          a.dateSortKey.localeCompare(b.dateSortKey) ||
          a.sessionKey.localeCompare(b.sessionKey),
      );

    const labelCounts = rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.chartLabel] = (acc[row.chartLabel] ?? 0) + 1;
      return acc;
    }, {});

    return rows.map((row) => {
      if (labelCounts[row.chartLabel] <= 1) return row;
      const shortId = shortSessionKeySuffix(row.sessionKey);
      return {
        ...row,
        chartLabel: `${row.chartLabel} (${shortId})`,
      };
    });
  }, [selectedClub, sessions]);

  const options: echarts.EChartsOption = {
    grid: {
      ...chartOptionsGrid,
      left: 56,
      right: 52,
      top: 34,
      bottom: 12,
      containLabel: true,
    },
    tooltip: {
      trigger: "axis",
      formatter: (params: any) => {
        const first = params?.[0];
        const index =
          typeof first?.dataIndex === "number"
            ? first.dataIndex
            : (params?.find((p: any) => typeof p?.dataIndex === "number")
                ?.dataIndex ?? 0);
        const row = trendData[index];
        const shots = row?.shotCount ?? 0;
        const dispersionLine = row
          ? row.dispersionAvg !== null
            ? `Avg dispersion (carry offline): ${row.dispersionAvg} ${unit}`
            : "Avg dispersion (carry offline): no deviation data"
          : "";
        return [
          params?.[0]?.axisValueLabel ?? "",
          row ? `Carry average: ${row.carryAvg} ${unit}` : "",
          dispersionLine,
          shots ? `Shots: ${shots}` : "",
        ]
          .filter(Boolean)
          .join("<br/>");
      },
    },
    legend: { top: 2, left: "center", type: "scroll" },
    xAxis: {
      type: "category",
      data: trendData.map((entry) => entry.chartLabel),
      axisLabel: {
        interval: 0,
        rotate: 0,
        width: 96,
        overflow: "truncate",
      },
    },
    yAxis: [
      {
        type: "value",
        name: `Carry (${unit})`,
        nameLocation: "middle",
        nameGap: 36,
      },
      {
        type: "value",
        name: `Dispersion (${unit})`,
        nameLocation: "middle",
        nameGap: 44,
        alignTicks: true,
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: "Carry average",
        type: "line",
        yAxisIndex: 0,
        smooth: true,
        data: trendData.map((entry) => entry.carryAvg),
      },
      {
        name: "Avg dispersion (carry offline)",
        type: "line",
        yAxisIndex: 1,
        smooth: true,
        connectNulls: false,
        data: trendData.map((entry) => entry.dispersionAvg),
      },
    ],
  };

  return (
    <div className="rounded-xl bg-white p-4 dark:bg-gray-800">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-start gap-2">
          <div>
            <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              Club Trend
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Carry average and carry offline dispersion per session, in
              chronological order.
            </p>
          </div>
          <RangeBallBadge className="ml-0 shrink-0" />
        </div>
        <div className="w-full sm:max-w-56">
          <BaseLabel>Club</BaseLabel>
          <BaseListbox
            options={clubOptions}
            setOption={setSelectedClub}
            value={selectedClub}
            valueText={selectedClub || "No clubs"}
            ariaLabel="Select club for trend chart"
          />
        </div>
      </div>
      <div className="h-[360px] w-full">
        <BaseGraph options={options} />
      </div>
    </div>
  );
};

/** Short, human-readable disambiguator when two sessions share the same display name. */
function shortSessionKeySuffix(sessionKey: string): string {
  const base = sessionKey.includes("/")
    ? sessionKey.slice(sessionKey.lastIndexOf("/") + 1)
    : sessionKey;
  return base.length > 24 ? `${base.slice(0, 21)}…` : base;
}
