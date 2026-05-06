import * as echarts from "echarts";
import { useMemo } from "react";
import { useUnit } from "../../../hooks/useUnit";
import { useBestShots } from "../../../utils/calculateAverages";
import { BaseGraph } from "../../base/BaseGraph";
import { chartOptionsGrid } from "../../base/chartOptions";

const GAP_ALERT_THRESHOLD = 18;

export const GappingChart = () => {
  const { averages } = useBestShots();
  const unit = useUnit();

  const chartData = useMemo(() => {
    const clubs = averages
      .map((club) => ({
        name: club.name,
        carry:
          typeof club["Carry Distance"] === "number"
            ? club["Carry Distance"]
            : 0,
      }))
      .filter((club) => !!club.name && club.carry > 0)
      .sort((a, b) => a.carry - b.carry);

    const gaps = clubs.map((club, index) => {
      if (index === 0) return "";
      const previousCarry = clubs[index - 1].carry;
      const gap = Math.round(club.carry - previousCarry);
      return `+${gap} ${unit}`;
    });

    return { clubs, gaps };
  }, [averages, unit]);

  const options: echarts.EChartsOption = {
    grid: { ...chartOptionsGrid, left: 18, right: 12, top: 20, bottom: 55 },
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
          `Carry: ${first.value} ${unit}`,
          gap || "",
        ]
          .filter(Boolean)
          .join("<br/>");
      },
    },
    xAxis: {
      type: "category",
      data: chartData.clubs.map((club) => club.name),
      axisLabel: { interval: 0, rotate: 25 },
    },
    yAxis: {
      type: "value",
      name: `Carry (${unit})`,
    },
    series: [
      {
        type: "bar",
        data: chartData.clubs.map((club) => Math.round(club.carry)),
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
