import * as echarts from "echarts";
import { useEffect, useMemo, useState } from "react";
import { useUnit } from "../../../hooks/useUnit";
import { useSelectedSessionsWithSettings } from "../../../hooks/useSelectedSessions";
import {
  getCarryDistance,
  getClubName,
} from "../../../utils/golfSwingData.helpers";
import { parseDate } from "../../../utils/utils";
import { BaseGraph } from "../../base/BaseGraph";
import { chartOptionsGrid } from "../../base/chartOptions";
import { BaseLabel } from "../../base/BaseLabel";
import { BaseListbox } from "../../base/BaseListbox";

type ClubSessionStat = {
  sessionLabel: string;
  carryAvg: number;
  dispersion: number;
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

    return Object.values(sessions)
      .map((session) => {
        const carries = session.results
          .filter((shot) => String(getClubName(shot) ?? "") === selectedClub)
          .map((shot) => getCarryDistance(shot))
          .filter((value): value is number => typeof value === "number");
        if (!carries.length) return null;

        const carryAvg =
          carries.reduce((sum, value) => sum + value, 0) / carries.length;
        const variance =
          carries.reduce((sum, value) => sum + (value - carryAvg) ** 2, 0) /
          carries.length;
        return {
          sessionLabel: session.displayName?.trim() || parseDate(session.date),
          carryAvg: Number(carryAvg.toFixed(2)),
          dispersion: Number(Math.sqrt(variance).toFixed(2)),
          shotCount: carries.length,
        };
      })
      .filter((value): value is ClubSessionStat => value !== null);
  }, [selectedClub, sessions]);

  const options: echarts.EChartsOption = {
    grid: { ...chartOptionsGrid, left: 16, right: 16, top: 20, bottom: 46 },
    tooltip: {
      trigger: "axis",
      formatter: (params: any) => {
        const carry = params?.find(
          (point: any) => point.seriesName === "Carry Avg",
        );
        const dispersion = params?.find(
          (point: any) => point.seriesName === "Dispersion (Std Dev)",
        );
        const index = carry?.dataIndex ?? dispersion?.dataIndex ?? 0;
        const shots = trendData[index]?.shotCount ?? 0;
        return [
          params?.[0]?.axisValueLabel ?? "",
          carry ? `Carry Avg: ${carry.value} ${unit}` : "",
          dispersion ? `Dispersion: ${dispersion.value} ${unit}` : "",
          `Shots: ${shots}`,
        ]
          .filter(Boolean)
          .join("<br/>");
      },
    },
    legend: { top: 0, right: 10 },
    xAxis: {
      type: "category",
      data: trendData.map((entry) => entry.sessionLabel),
      axisLabel: { interval: 0, rotate: 20 },
    },
    yAxis: { type: "value", name: unit },
    series: [
      {
        name: "Carry Avg",
        type: "line",
        smooth: true,
        data: trendData.map((entry) => entry.carryAvg),
      },
      {
        name: "Dispersion (Std Dev)",
        type: "line",
        smooth: true,
        data: trendData.map((entry) => entry.dispersion),
      },
    ],
  };

  return (
    <div className="rounded-xl bg-white p-4 dark:bg-gray-800">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            Club Trend
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Track carry average and dispersion over time for a single club.
          </p>
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
