import * as echarts from "echarts";
import { useMemo } from "react";
import { useUnit } from "../../../hooks/useUnit";
import { useBestShots } from "../../../utils/calculateAverages";
import { abbreviateClubName } from "../../../utils/clubAbbreviations";
import { BaseGraph } from "../../base/BaseGraph";
import { chartOptionsGrid } from "../../base/chartOptions";

/** Gaps tighter than this (vs previous club, same unit as chart) overlap too much. */
const GAP_GOOD_MIN_YARDS = 8;
/** Gaps this wide or wider suggest a missing club / big hole in the bag. */
const GAP_GOOD_MAX_EXCLUSIVE_YARDS = 18;
const YARDS_TO_METERS = 0.9144;

const BAR_GAP_NEUTRAL = "#94a3b8"; // slate-400 — no prior club to compare
const BAR_TOO_SMALL = "#f97316"; // orange-500
const BAR_JUST_RIGHT = "#22c55e"; // green-500
const BAR_TOO_LARGE = "#eab308"; // yellow-500

type GapQuality = "none" | "too-small" | "just-right" | "too-large";

function classifyGap(distanceDelta: number, unit: "yds" | "m"): GapQuality {
  const goodMin =
    unit === "m" ? GAP_GOOD_MIN_YARDS * YARDS_TO_METERS : GAP_GOOD_MIN_YARDS;
  const tooWideMin =
    unit === "m"
      ? GAP_GOOD_MAX_EXCLUSIVE_YARDS * YARDS_TO_METERS
      : GAP_GOOD_MAX_EXCLUSIVE_YARDS;
  if (distanceDelta < goodMin) return "too-small";
  if (distanceDelta >= tooWideMin) return "too-large";
  return "just-right";
}

function gapBandThresholds(unit: "yds" | "m") {
  const goodMin =
    unit === "m" ? GAP_GOOD_MIN_YARDS * YARDS_TO_METERS : GAP_GOOD_MIN_YARDS;
  const tooWideMin =
    unit === "m"
      ? GAP_GOOD_MAX_EXCLUSIVE_YARDS * YARDS_TO_METERS
      : GAP_GOOD_MAX_EXCLUSIVE_YARDS;
  return { goodMin, tooWideMin };
}
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

    const gaps: {
      label: string;
      yardage: number;
      quality: GapQuality;
    }[] = clubs.map((club, index) => {
      if (index === 0) {
        return { label: "", yardage: 0, quality: "none" as GapQuality };
      }
      const previousDistance = clubs[index - 1].distance;
      const yardage = Math.round(club.distance - previousDistance);
      const quality = classifyGap(yardage, unit);
      return {
        label: `+${yardage} ${unit}`,
        yardage,
        quality,
      };
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
        const fullName = chartData.clubs[index]?.name ?? `${first.axisValue}`;
        const gap = chartData.gaps[index];
        const qualityNote =
          gap.quality === "too-small"
            ? "(tight spacing vs previous)"
            : gap.quality === "too-large"
              ? "(wide spacing vs previous)"
              : gap.quality === "just-right"
                ? "(on-target spacing)"
                : "";
        return [
          fullName,
          `${metricLabel}: ${first.value} ${unit}`,
          gap.label ? `${gap.label} ${qualityNote}`.trim() : "",
        ]
          .filter(Boolean)
          .join("<br/>");
      },
    },
    xAxis: {
      type: "category",
      data: chartData.clubs.map((club) => abbreviateClubName(club.name)),
      axisLabel: {
        interval: 0,
        rotate: 0,
        width: 44,
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
            chartData.gaps[dataIndex]?.label ?? "",
          color: "#4b5563",
          fontWeight: "bold",
        },
        itemStyle: {
          color: ({ dataIndex }: { dataIndex: number }) => {
            const q = chartData.gaps[dataIndex]?.quality ?? "none";
            if (q === "none") return BAR_GAP_NEUTRAL;
            if (q === "too-small") return BAR_TOO_SMALL;
            if (q === "too-large") return BAR_TOO_LARGE;
            return BAR_JUST_RIGHT;
          },
        },
      },
    ],
  };

  const distanceUnit = unit === "m" ? "m" : "yds";
  const { goodMin, tooWideMin } = gapBandThresholds(distanceUnit);
  const fmt = (n: number) =>
    distanceUnit === "m" ? Math.round(n * 10) / 10 : Math.round(n);
  const maxGoodYards = GAP_GOOD_MAX_EXCLUSIVE_YARDS - 1;
  const onTargetUpper =
    distanceUnit === "m" ? fmt(maxGoodYards * YARDS_TO_METERS) : maxGoodYards;

  return (
    <div className="w-full">
      <div className="h-[360px] w-full">
        <BaseGraph options={options} />
      </div>
      <div
        className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-gray-600 dark:text-gray-400"
        aria-label="Gapping bar colors"
      >
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-sm"
            style={{ backgroundColor: BAR_TOO_SMALL }}
          />
          Tight (&lt;{fmt(goodMin)} {distanceUnit})
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-sm"
            style={{ backgroundColor: BAR_JUST_RIGHT }}
          />
          On target ({fmt(goodMin)}–{onTargetUpper} {distanceUnit})
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-sm"
            style={{ backgroundColor: BAR_TOO_LARGE }}
          />
          Wide (≥{fmt(tooWideMin)} {distanceUnit})
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-sm"
            style={{ backgroundColor: BAR_GAP_NEUTRAL }}
          />
          Shortest club (no prior gap)
        </span>
      </div>
    </div>
  );
};
