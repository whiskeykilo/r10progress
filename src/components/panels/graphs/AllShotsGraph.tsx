import * as echarts from "echarts";
import { useUnit } from "../../../hooks/useUnit";
import { BaseGraph } from "../../base/BaseGraph";
import { chartOptionsGrid } from "../../base/chartOptions";
import { abbreviateClubName } from "../../../utils/clubAbbreviations";
import { useCarryAndDeviation } from "./ShotDispersionGraph.utils";

export const AllShotsGraph = () => {
  const shots = useCarryAndDeviation();
  const unit = useUnit();

  let maximumDeviation = Math.max(
    ...shots.shots.map((shot) => Math.abs(Number(shot.x))),
    0,
  );
  // Round up to the nearest 10
  maximumDeviation = Math.ceil(maximumDeviation / 10) * 10;

  const options: echarts.EChartsOption = {
    grid: { ...chartOptionsGrid, bottom: 45 },
    tooltip: {
      trigger: "item",
      formatter: (params: any) => {
        return [
          `Deviation: ${params.value[0].toFixed(2)} ${unit}`,
          `Carry: ${params.value[1].toFixed(2)} ${unit}`,
          `Club: ${params.data.club}`,
        ].join("<br/>");
      },
    },
    xAxis: {
      type: "value",
      name: `Deviation (${unit})`,
      min: -maximumDeviation,
      max: maximumDeviation,
      axisLabel: {
        formatter: (value: number) => `${value} ${unit}`,
      },
    },
    yAxis: {
      type: "value",
      name: `Carry (${unit})`,
      axisLabel: {
        formatter: (value: number) => `${value} ${unit}`,
      },
    },
    legend: {
      orient: "horizontal",
      top: "bottom",
      formatter: abbreviateClubName,
    },
    series: Object.entries(shots.shotsByClub).map(([club, shots]) => ({
      type: "scatter",
      name: club,
      data: shots.map((shot) => ({
        value: [shot.x, shot.y],
        club,
      })),
    })),
  };

  return (
    <div className="h-[400px] w-full">
      <BaseGraph options={options} />
    </div>
  );
};
