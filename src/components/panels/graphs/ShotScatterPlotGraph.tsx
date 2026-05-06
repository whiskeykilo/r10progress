import {
  GolfSwingData,
  golfSwingDataKeysInDegrees,
  golfSwingDataKeysInMeters,
} from "../../../types/GolfSwingData.ts";
import { useUnit } from "../../../hooks/useUnit.ts";

import { BaseGraph } from "../../base/BaseGraph.tsx";
import {
  chartOptionsDateTooltip,
  chartOptionsGrid,
  chartOptionsVisualRecencyMap,
  golfSwingDataAxisFormatter,
  PointWithDate,
} from "../../base/chartOptions.ts";

export const ShotScatterPlotGraph = ({
  xField,
  yField,
  chartData,
}: {
  xField: string;
  yField: string;
  chartData: PointWithDate[];
}) => {
  const unit = useUnit();
  const xAxisName = formatAxisName(xField as keyof GolfSwingData, unit);
  const yAxisName = formatAxisName(yField as keyof GolfSwingData, unit);
  const chartOptions: echarts.EChartsOption = {
    grid: {
      ...chartOptionsGrid,
      left: 30,
      right: 16,
      top: 18,
      bottom: 42,
    },
    tooltip: chartOptionsDateTooltip(xField, yField),
    visualMap: chartOptionsVisualRecencyMap(chartData),
    xAxis: {
      type: "value",
      name: xAxisName,
      nameLocation: "middle",
      nameGap: 28,
      axisLabel: {
        formatter: golfSwingDataAxisFormatter(
          xField as keyof GolfSwingData,
          unit,
        ),
      },
    },
    yAxis: {
      type: "value",
      name: yAxisName,
      nameLocation: "middle",
      nameGap: 52,
      axisLabel: {
        formatter: golfSwingDataAxisFormatter(
          yField as keyof GolfSwingData,
          unit,
        ),
      },
    },
    series: [
      {
        type: "scatter",
        data: chartData.map((d) => [d.x, d.y, new Date(d.date).getTime()]),
      },
    ],
  };

  if (!chartData) return null;

  return (
    <div className="h-[400px] w-full">
      <BaseGraph options={chartOptions} />
    </div>
  );
};

const formatAxisName = (field: keyof GolfSwingData, distanceUnit: string) => {
  if (golfSwingDataKeysInMeters.includes(field)) {
    return `${field} (${distanceUnit})`;
  }
  if (golfSwingDataKeysInDegrees.includes(field)) {
    return `${field} (deg)`;
  }
  const fieldName = String(field).toLowerCase();
  if (fieldName.includes("spin")) {
    return `${field} (rpm)`;
  }
  if (
    fieldName.includes("speed") ||
    fieldName.includes("geschwindigkeit") ||
    fieldName.includes("snelh") ||
    fieldName.includes("velocidad")
  ) {
    return `${field} (mph)`;
  }
  return String(field);
};
