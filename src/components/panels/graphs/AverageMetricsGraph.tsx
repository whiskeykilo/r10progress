import * as echarts from "echarts";
import {
  GolfSwingData,
  golfSwingDataKeysInDegrees,
  golfSwingDataKeysInMeters,
} from "../../../types/GolfSwingData";
import { useUnit } from "../../../hooks/useUnit";
import { useSettings } from "../../../provider/SettingsContext";
import { BaseGraph } from "../../base/BaseGraph";
import { chartOptionsGrid } from "../../base/chartOptions";
import { abbreviateClubName } from "../../../utils/clubAbbreviations";
import { ClubDataForTable } from "../AveragesPerSession";
import { RangeBallBadge } from "../../RangeBallBadge";

export type AverageMetricsChartMode = "perSession" | "aggregated";

export const AverageMetricsGraph = ({
  metric,
  data,
  chartMode = "perSession",
}: {
  metric: keyof GolfSwingData;
  data: ClubDataForTable;
  chartMode?: AverageMetricsChartMode;
}) => {
  const { settings } = useSettings();
  const distanceUnit = useUnit();
  const hasClubData = data.length > 0;
  const chartUsesDistance = golfSwingDataKeysInMeters.includes(
    metric as (typeof golfSwingDataKeysInMeters)[number],
  );
  const metricUnit = getMetricUnit(metric, distanceUnit);
  const yAxisName = metricUnit ? `${metric} (${metricUnit})` : metric;

  const { xCategories, seriesData, tooltipFormatter, legendShow, xAxisLabel } =
    chartMode === "aggregated"
      ? buildAggregatedChart(data, metricUnit)
      : buildPerSessionChart(data, metricUnit);

  const options: echarts.EChartsOption = {
    grid: {
      ...chartOptionsGrid,
      bottom: hasClubData ? 45 : 46,
    },
    tooltip: {
      trigger: "axis",
      formatter: tooltipFormatter,
    },
    xAxis: {
      type: "category",
      data: xCategories,
      axisLabel: xAxisLabel,
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
      show: legendShow,
      orient: "horizontal",
      type: "scroll",
      bottom: 0,
      formatter: (name: string) =>
        name === "Average" ? name : abbreviateClubName(name),
    },
  };

  return (
    <div className="relative h-full w-full">
      {settings.applyRangeBallCompensation && chartUsesDistance ? (
        <div className="pointer-events-none absolute right-0 top-0 z-10">
          <span className="pointer-events-auto">
            <RangeBallBadge className="ml-0" />
          </span>
        </div>
      ) : null}
      <BaseGraph options={options} />
    </div>
  );
};

function buildAggregatedChart(
  data: ClubDataForTable,
  metricUnit: string,
): {
  xCategories: string[];
  seriesData: echarts.SeriesOption[];
  tooltipFormatter: (params: unknown) => string;
  legendShow: boolean;
  xAxisLabel: { show: boolean; rotate?: number };
} {
  const clubsOrdered = dedupePreserveOrder(data.map((d) => d.club));
  const seriesData: echarts.SeriesOption[] = [
    {
      name: "Average",
      type: "bar",
      data: clubsOrdered.map((club) => {
        const match = data.find((d) => d.club === club);
        return match?.y ?? null;
      }),
    },
  ];

  const xAbbrev = clubsOrdered.map((club) => abbreviateClubName(club));
  return {
    xCategories: xAbbrev,
    seriesData,
    tooltipFormatter: (params: unknown) => {
      const first = (
        params as { axisValueLabel?: string; dataIndex?: number }[]
      )?.[0];
      const idx =
        typeof first?.dataIndex === "number"
          ? first.dataIndex
          : Math.max(0, xAbbrev.indexOf(String(first?.axisValueLabel ?? "")));
      const clubFull = clubsOrdered[idx] ?? first?.axisValueLabel ?? "";
      const rows = ((params as any[]) ?? [])
        .filter((p) => p.value !== null && p.value !== undefined)
        .map((p) => `${formatAxisValue(p.value as number, metricUnit)}`);
      return [`${clubFull}`, ...rows].join("<br/>");
    },
    legendShow: false,
    xAxisLabel: { show: true, rotate: 28 },
  };
}

function buildPerSessionChart(
  data: ClubDataForTable,
  metricUnit: string,
): {
  xCategories: string[];
  seriesData: echarts.SeriesOption[];
  tooltipFormatter: (params: unknown) => string;
  legendShow: boolean;
  xAxisLabel: { show: boolean };
} {
  const sessions = Array.from(
    new Set(data.map((d) => d.x).filter(Boolean) as string[]),
  );
  const clubs = Array.from(new Set(data.map((d) => d.club)));
  const seriesData: echarts.SeriesOption[] = clubs.map((club) => ({
    name: club,
    type: "bar",
    data: sessions.map((sessionLabel) => {
      const match = data.find(
        (d) => d.club === club && d.x && d.x === sessionLabel,
      );
      return match?.y ?? null;
    }),
  }));

  return {
    xCategories: sessions,
    seriesData,
    tooltipFormatter: (params: any) => {
      const session = params?.[0]?.axisValueLabel;
      const rows = (params as any[])
        .filter((p) => p.value !== null && p.value !== undefined)
        .map((p) => `${p.seriesName}: ${formatAxisValue(p.value, metricUnit)}`);
      return [`Session: ${session}`, ...rows].join("<br/>");
    },
    legendShow: data.length > 0,
    xAxisLabel: { show: false },
  };
}

function dedupePreserveOrder(items: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    if (!seen.has(item)) {
      seen.add(item);
      out.push(item);
    }
  }
  return out;
}

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
