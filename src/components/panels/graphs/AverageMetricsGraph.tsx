import * as echarts from "echarts";
import {
  GolfSwingData,
  golfSwingDataKeysInDegrees,
  golfSwingDataKeysInMeters,
} from "../../../types/GolfSwingData";
import { useUnit } from "../../../hooks/useUnit";
import { BaseGraph } from "../../base/BaseGraph";
import { chartOptionsGrid } from "../../base/chartOptions";
import { ClubDataForTable } from "../AveragesPerSession";

export const AverageMetricsGraph = ({
  metric,
  data,
}: {
  metric: keyof GolfSwingData;
  data: ClubDataForTable;
}) => {
  const distanceUnit = useUnit();
  const hasClubData = data.length > 0;
  const sessions = Array.from(
    new Set(data.map((d) => d.x).filter(Boolean) as string[]),
  );
  const clubs = Array.from(new Set(data.map((d) => d.club)));
  const metricUnit = getMetricUnit(metric, distanceUnit);
  const yAxisName = metricUnit ? `${metric} (${metricUnit})` : metric;
  const seriesData: echarts.SeriesOption[] = clubs.map((club) => ({
    name: club,
    type: "bar",
    data: sessions.map((sessionLabel) => {
      const match = data.find(
        (d) =>
          d.club === club &&
          d.x &&
          d.x === sessionLabel,
      );
      return match?.y ?? null;
    }),
  }));

  const options: echarts.EChartsOption = {
    grid: { ...chartOptionsGrid, bottom: "25%" },
    tooltip: {
      trigger: "axis",
      formatter: (params: any) => {
        const session = params?.[0]?.axisValueLabel;
        const rows = (params as any[])
          .filter((p) => p.value !== null && p.value !== undefined)
          .map((p) => `${p.seriesName}: ${formatAxisValue(p.value, metricUnit)}`);
        return [`Session: ${session}`, ...rows].join("<br/>");
      },
    },
    xAxis: {
      type: "category",
      name: "Session",
      data: sessions,
    },
    yAxis: {
      type: "value",
      name: yAxisName,
      axisLabel: {
        formatter: (value: number) => formatAxisValue(value, metricUnit),
      },
    },
    series: seriesData,
    legend: {
      show: !!hasClubData,
      orient: "horizontal",
      top: "75%",
    },
  };

  return <BaseGraph options={options} />;
};

const getMetricUnit = (metric: keyof GolfSwingData, distanceUnit: string) => {
  const metricName = String(metric).toLowerCase();

  if (golfSwingDataKeysInMeters.includes(metric)) {
    return distanceUnit;
  }
  if (golfSwingDataKeysInDegrees.includes(metric)) {
    return "deg";
  }
  if (metricName.includes("spin")) {
    return "rpm";
  }
  if (
    metricName.includes("speed") ||
    metricName.includes("geschwindigkeit") ||
    metricName.includes("snelh") ||
    metricName.includes("velocidad")
  ) {
    return "mph";
  }
  if (metricName.includes("temperature") || metricName.includes("temperatur")) {
    return "deg C";
  }
  if (
    metricName.includes("humidity") ||
    metricName.includes("feuchtigkeit") ||
    metricName.includes("humedad") ||
    metricName.includes("vochtigheid")
  ) {
    return "%";
  }
  if (
    metricName.includes("pressure") ||
    metricName.includes("druck") ||
    metricName.includes("presion")
  ) {
    return "hPa";
  }
  return "";
};

const formatAxisValue = (value: number, unit: string) =>
  unit ? `${value} ${unit}` : `${value}`;
