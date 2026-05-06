import * as echarts from "echarts";
import { useMemo } from "react";
import { useUnit } from "../../../hooks/useUnit";
import { useBestShots } from "../../../utils/calculateAverages";
import { BaseGraph } from "../../base/BaseGraph";
import { chartOptionsGrid } from "../../base/chartOptions";

const GAP_ALERT_THRESHOLD = 18;
const CARRY_DISTANCE_KEYS = [
  "Carry Distance",
  "Carry-Distanz",
  "Dist.​vuelo",
  "Dist. vuelo",
  "Carry-afstand",
] as const;
const TOTAL_DISTANCE_KEYS = [
  "Total Distance",
  "Gesamtstrecke",
  "Distan​cia total",
  "Distancia total",
  "Totale afstand",
] as const;

type GappingDistanceMetric = "carry" | "total";

type GappingChartProps = {
  distanceMetric?: GappingDistanceMetric;
};

export const GappingChart = ({
  distanceMetric = "carry",
}: GappingChartProps) => {
  const { averages } = useBestShots();
  const unit = useUnit();

  const chartData = useMemo(() => {
    type ClubDistance = { name: string; distance: number };
    const metricKeys =
      distanceMetric === "total" ? TOTAL_DISTANCE_KEYS : CARRY_DISTANCE_KEYS;

    const clubs: ClubDistance[] = averages
      .map((club) => ({
        name: club.name,
        distance: metricKeys.reduce<number>((selectedDistance, key) => {
          if (selectedDistance > 0) return selectedDistance;
          const value = club[key as keyof typeof club];
          return typeof value === "number" && Number.isFinite(value)
            ? value
            : selectedDistance;
        }, 0),
      }))
      .filter((club) => !!club.name && club.distance > 0)
      .sort((a, b) => a.distance - b.distance);

    const gaps = clubs.map((club, index) => {
      if (index === 0) return "";
      const previousDistance = clubs[index - 1].distance;
      const gap = Math.round(club.distance - previousDistance);
      return `+${gap} ${unit}`;
    });

    return { clubs, gaps };
  }, [averages, distanceMetric, unit]);

  const metricLabel = distanceMetric === "total" ? "Total" : "Carry";

  const options: echarts.EChartsOption = {
    grid: {
      ...chartOptionsGrid,
      left: 58,
      right: 12,
      top: 12,
      bottom: 12,
      containLabel: true,
    },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params: any) => {
        const first = params?.[0];
        if (!first) return "";
        const index = first.dataIndex as number;
        const gap = chartData.gaps[index];
        return [
          `${first.axisValue}`,
          `${metricLabel}: ${first.value} ${unit}`,
          gap || "",
        ]
          .filter(Boolean)
          .join("<br/>");
      },
    },
    xAxis: {
      type: "category",
      data: chartData.clubs.map((club) => club.name),
      axisLabel: {
        interval: 0,
        rotate: 0,
        width: 72,
        overflow: "truncate",
      },
    },
    yAxis: {
      type: "value",
      name: `${metricLabel} (${unit})`,
      nameLocation: "middle",
      nameGap: 44,
    },
    series: [
      {
        type: "bar",
        data: chartData.clubs.map((club) => Math.round(club.distance)),
        label: {
          show: true,
          position: "top",
          formatter: ({ dataIndex }: { dataIndex: number }) =>
            chartData.gaps[dataIndex] || "",
          color: "#4b5563",
          fontWeight: "bold",
        },
        itemStyle: {
          color: ({ dataIndex }: { dataIndex: number }) => {
            if (dataIndex === 0) return "#0ea5e9";
            const gapText = chartData.gaps[dataIndex];
            const gapValue = Number(gapText.replace(/[^\d.-]/g, ""));
            return gapValue >= GAP_ALERT_THRESHOLD ? "#f59e0b" : "#0ea5e9";
          },
        },
      },
    ],
  };

  return (
    <div className="h-[360px] w-full">
      <BaseGraph options={options} />
    </div>
  );
};
