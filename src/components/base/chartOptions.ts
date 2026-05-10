import * as echarts from "echarts";
import {
  GolfSwingData,
  golfSwingDataKeysInDegrees,
  golfSwingDataKeysInMeters,
} from "../../types/GolfSwingData";

export const chartOptionsGrid = {
  left: 5,
  right: 5,
  top: 5,
  bottom: 5,
  containLabel: true,
};

/**
 * This tooltip shows both selected fiels (xField and yField) and the formatted date
 */
export const chartOptionsDateTooltip: (
  xField: string,
  yField: string,
) => echarts.TooltipComponentOption = (xField, yField) => ({
  trigger: "item",
  formatter: (params: any) =>
    `${xField}: ${params.value[0]?.toFixed(2) ?? "N/A"}<br/>
         ${yField}: ${params.value[1]?.toFixed(2) ?? "N/A"}<br/>
         Date: ${params.value[2] ?? "N/A"}`,
});

/**
 * This function returns the visual map options for the chart based on the chart data's recency.
 * @param chartData An array of chart data where the third data point is a date.
 * @returns The visual map for the chart.
 */
export const chartOptionsVisualRecencyMap = (chartData: any[]) => {
  const minNumber = Math.min(
    ...chartData.map((d) => new Date(d.date).getTime()),
  );
  const maxNumber = Math.max(
    ...chartData.map((d) => new Date(d.date).getTime()),
  );
  const data = [
    {
      type: "continuous",
      show: false,
      inRange: {
        color: ["lightgrey", "rgb(12, 121, 188)"],
      },
      dimension: 2, // Map colors based on the `date` field (index 2 in the data array)
      min: minNumber,
      max: maxNumber,
    },
  ];
  return data;
};

/**
 * This function returns a formatter that shows the unit designation for the axis labels.
 */
export const golfSwingDataAxisFormatter =
  (xField: keyof GolfSwingData, distanceUnit = "m") =>
  (value: number) =>
    golfSwingDataKeysInMeters.includes(xField as keyof GolfSwingData)
      ? `${value} ${distanceUnit}`
      : golfSwingDataKeysInDegrees.includes(xField as keyof GolfSwingData)
        ? `${value} °`
        : `${value}`;

export type PointWithDate = {
  x: GolfSwingData[keyof GolfSwingData];
  y: GolfSwingData[keyof GolfSwingData];
  date: string;
};

export type PointWithClub = {
  x: number;
  y: number;
  club: string;
};

/** Axis label / name colors for Tailwind-style light vs `dark` UI backgrounds */
const CHART_AXIS_LIGHT = "#374151";
const CHART_AXIS_DARK = "#e5e7eb";

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function paintOneAxis(axis: unknown, color: string): unknown {
  if (!axis || typeof axis !== "object") return axis;
  const a = axis as Record<string, unknown>;

  const axisLabel = asRecord(a.axisLabel);
  const nameTextStyle = asRecord(a.nameTextStyle);

  let axisLine: unknown = a.axisLine;
  if (axisLine !== false && axisLine !== undefined) {
    const line = asRecord(axisLine);
    const lineStyle = asRecord(line.lineStyle);
    axisLine = { ...line, lineStyle: { ...lineStyle, color } };
  }

  let axisTick: unknown = a.axisTick;
  if (axisTick !== false && axisTick !== undefined) {
    const tick = asRecord(axisTick);
    const lineStyle = asRecord(tick.lineStyle);
    axisTick = { ...tick, lineStyle: { ...lineStyle, color } };
  }

  return {
    ...a,
    axisLabel: { ...axisLabel, color },
    nameTextStyle: { ...nameTextStyle, color },
    axisLine,
    axisTick,
  };
}

function paintAxes(axes: unknown, color: string): unknown {
  if (axes === undefined) return undefined;
  if (Array.isArray(axes)) return axes.map((ax) => paintOneAxis(ax, color));
  return paintOneAxis(axes, color);
}

function mergeLegend(legend: unknown, color: string): unknown {
  if (Array.isArray(legend))
    return legend.map((item) => mergeLegend(item, color));
  if (!legend || typeof legend !== "object") return legend;
  const L = legend as Record<string, unknown>;
  const textStyle = asRecord(L.textStyle);
  return { ...L, textStyle: { ...textStyle, color } };
}

function mergeTooltip(tooltip: unknown, isDark: boolean): unknown {
  if (Array.isArray(tooltip))
    return tooltip.map((item) => mergeTooltip(item, isDark));
  if (!tooltip || typeof tooltip !== "object") return tooltip;
  const T = tooltip as Record<string, unknown>;
  const textStyle = asRecord(T.textStyle);
  if (isDark) {
    return {
      ...T,
      backgroundColor: "rgba(31, 41, 55, 0.96)",
      borderColor: "#4b5563",
      textStyle: { ...textStyle, color: "#f9fafb" },
    };
  }
  return {
    ...T,
    textStyle: { ...textStyle, color: CHART_AXIS_LIGHT },
  };
}

/**
 * Merge readable axis / legend / tooltip colors for light vs dark app chrome.
 * Used by BaseGraph so individual charts do not need theme branches.
 */
export function applyReadableChartTheme(
  options: echarts.EChartsOption,
  isDark: boolean,
): echarts.EChartsOption {
  const color = isDark ? CHART_AXIS_DARK : CHART_AXIS_LIGHT;
  const prevText = asRecord(options.textStyle);

  const next: Record<string, unknown> = { ...options };
  next.textStyle = { ...prevText, color };
  if (options.xAxis !== undefined) next.xAxis = paintAxes(options.xAxis, color);
  if (options.yAxis !== undefined) next.yAxis = paintAxes(options.yAxis, color);

  const legendOpt = options.legend as unknown;
  if (legendOpt !== undefined && legendOpt !== false) {
    next.legend = mergeLegend(legendOpt, color);
  }

  const tooltipOpt = options.tooltip as unknown;
  if (tooltipOpt !== undefined && tooltipOpt !== false) {
    next.tooltip = mergeTooltip(tooltipOpt, isDark);
  }

  return next as echarts.EChartsOption;
}
