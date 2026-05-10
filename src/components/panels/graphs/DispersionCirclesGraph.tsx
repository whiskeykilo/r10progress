import * as echarts from "echarts";
import { useUnit } from "../../../hooks/useUnit";
import { BaseGraph } from "../../base/BaseGraph";
import { chartOptionsGrid, PointWithClub } from "../../base/chartOptions";
import { abbreviateClubName } from "../../../utils/clubAbbreviations";
import { chartColorForClubIndex } from "../../../utils/clubChartOrder";
import { useCarryAndDeviation } from "./ShotDispersionGraph.utils";

export const DispersionCirclesGraph = () => {
  const { shots, shotsByClub } = useCarryAndDeviation();
  const unit = useUnit();

  let maximumDeviation = Math.max(
    ...shots.map((shot) => Math.abs(Number(shot.x))),
    0,
  );
  // Round up to the nearest 10
  maximumDeviation = Math.ceil(maximumDeviation / 10) * 10;

  const clubsInSeriesOrder = Object.keys(shotsByClub);

  const series = clubsInSeriesOrder
    .map((club, clubIndex) => {
      const clubShots = shotsByClub[club];
      const centerX =
        clubShots.reduce((sum, shot) => sum + shot.x, 0) / clubShots.length;
      const centerY =
        clubShots.reduce((sum, shot) => sum + shot.y, 0) / clubShots.length;

      const color = chartColorForClubIndex(clubIndex);

      const calculateEllipseAxes = (shots: PointWithClub[]) => {
        const xValues = shots.map((shot) => shot.x);
        const yValues = shots.map((shot) => shot.y);

        // Calculate standard deviations
        const xStdDev = Math.sqrt(
          xValues.reduce((sum, x) => sum + Math.pow(x - centerX, 2), 0) /
            shots.length,
        );
        const yStdDev = Math.sqrt(
          yValues.reduce((sum, y) => sum + Math.pow(y - centerY, 2), 0) /
            shots.length,
        );

        // Use 2 standard deviations to cover ~95% of shots
        return {
          xAxis: xStdDev * 2.5,
          yAxis: yStdDev * 2.5,
        };
      };
      const ellipseAxes = calculateEllipseAxes(clubShots);

      return [
        {
          color,
          name: club,
          type: "scatter" as const,
          data: clubShots.map((shot) => ({
            value: [shot.x, shot.y],
            club: shot.club,
          })),
          symbolSize: 8,
        },
        {
          color,
          name: `${club} Dispersion`,
          type: "line" as const,
          smooth: true,
          symbol: "none",
          data: calculateEllipsePoints(
            [centerX, centerY],
            ellipseAxes.xAxis,
            ellipseAxes.yAxis,
          ),
          lineStyle: {
            opacity: 0.5,
            width: 1,
          },
          silent: true,
        },
      ];
    })
    .flat();

  const options: echarts.EChartsOption = {
    grid: {
      ...chartOptionsGrid,
      bottom: 45,
      backgroundColor: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: "#91B491" }, // Lighter green at top
        { offset: 1, color: "#739E73" }, // Darker green at bottom
      ]),
    },
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
      nameLocation: "middle",
      nameGap: 28,
      min: -maximumDeviation,
      max: maximumDeviation,
      axisLabel: {
        formatter: (value: number) => `${value} ${unit}`,
      },
    },
    yAxis: {
      type: "value",
      name: `Carry (${unit})`,
      nameLocation: "middle",
      nameGap: 52,
      axisLabel: {
        formatter: (value: number) => `${value} ${unit}`,
      },
    },
    legend: {
      orient: "horizontal",
      top: "bottom",
      data: clubsInSeriesOrder,
      formatter: (name: string) => abbreviateClubName(name),
    },
    series,
  };

  return (
    <div className="h-[400px] w-full">
      <BaseGraph options={options} />
    </div>
  );
};

const calculateEllipsePoints = (
  center: [number, number],
  xAxis: number,
  yAxis: number,
): number[][] => {
  const points: number[][] = [];
  for (let angle = 0; angle <= 360; angle += 5) {
    const radian = (angle * Math.PI) / 180;
    const x = center[0] + xAxis * Math.cos(radian);
    const y = center[1] + yAxis * Math.sin(radian);
    points.push([x, y]);
  }
  return points;
};
