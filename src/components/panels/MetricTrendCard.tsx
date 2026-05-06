import { useEffect, useMemo, useState } from "react";
import { BaseLabel } from "../base/BaseLabel";
import { BaseListbox } from "../base/BaseListbox";
import { useAveragePerSession } from "../../utils/calculateAverages";
import { parseDate } from "../../utils/utils";

type MetricTrendCardProps = {
  metric?: string;
  title?: string;
};

const NON_CLUB_METRICS = new Set([
  "Air Density",
  "Air Pressure",
  "Temperature",
  "Relative Humidity",
]);

export const MetricTrendCard = ({
  metric = "Carry Distance",
  title = "Trend Snapshot",
}: MetricTrendCardProps) => {
  const perSession = useAveragePerSession();
  const [selectedClub, setSelectedClub] = useState<string>("");
  const [selectedMetric, setSelectedMetric] = useState<string>(metric);

  const clubs = useMemo(
    () =>
      Array.from(
        new Set(
          perSession
            .flatMap((entry) => entry.averages.map((average) => average.name))
            .filter((club): club is string => Boolean(club)),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [perSession],
  );

  useEffect(() => {
    if (clubs.length === 0) {
      setSelectedClub("");
      return;
    }

    setSelectedClub((current) =>
      clubs.includes(current) ? current : clubs[0],
    );
  }, [clubs]);

  const availableMetrics = useMemo(() => {
    if (!selectedClub) return [];

    const metricSet = new Set<string>();
    perSession.forEach((entry) => {
      const clubAverage = entry.averages.find(
        (average) => average.name === selectedClub,
      );
      if (!clubAverage) return;

      Object.entries(clubAverage).forEach(([key, value]) => {
        if (
          key !== "name" &&
          key !== "count" &&
          !NON_CLUB_METRICS.has(key) &&
          typeof value === "number" &&
          Number.isFinite(value)
        ) {
          metricSet.add(key);
        }
      });
    });

    return Array.from(metricSet).sort((a, b) => a.localeCompare(b));
  }, [perSession, selectedClub]);

  useEffect(() => {
    if (availableMetrics.length === 0) {
      setSelectedMetric("");
      return;
    }

    setSelectedMetric((current) =>
      availableMetrics.includes(current) ? current : availableMetrics[0],
    );
  }, [availableMetrics]);

  const trend = useMemo(() => {
    if (!selectedClub || !selectedMetric) {
      return {
        recentAvg: null,
        previousAvg: null,
        delta: null,
        recentShots: 0,
        confidence: "Low",
      };
    }

    const sessionValues = perSession
      .map((entry) => {
        const clubAverage = entry.averages.find(
          (average) => average.name === selectedClub,
        );
        if (!clubAverage) return null;

        const metricValue =
          clubAverage[selectedMetric as keyof typeof clubAverage];
        if (typeof metricValue !== "number" || !Number.isFinite(metricValue)) {
          return null;
        }

        return {
          date: parseDate(entry.date),
          value: metricValue,
          shotCount: clubAverage.count ?? 0,
        };
      })
      .filter((value): value is NonNullable<typeof value> => value !== null)
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    const recent = sessionValues.slice(-3);
    const previous = sessionValues.slice(-6, -3);

    const average = (values: typeof sessionValues) =>
      values.length === 0
        ? null
        : values.reduce((sum, value) => sum + value.value, 0) / values.length;
    const recentAvg = average(recent);
    const previousAvg = average(previous);
    const delta =
      recentAvg !== null && previousAvg !== null
        ? recentAvg - previousAvg
        : null;
    const recentShots = recent.reduce((sum, value) => sum + value.shotCount, 0);
    const confidence =
      recentShots >= 90 ? "High" : recentShots >= 45 ? "Medium" : "Low";

    return { recentAvg, previousAvg, delta, recentShots, confidence };
  }, [perSession, selectedClub, selectedMetric]);

  return (
    <div className="rounded-xl bg-white p-4 dark:bg-gray-800">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            {title}
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Compare your last 3 sessions vs previous 3 for a specific club.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="w-full sm:min-w-52">
            <BaseLabel>Club</BaseLabel>
            <BaseListbox
              options={clubs}
              setOption={setSelectedClub}
              value={selectedClub}
              valueText={selectedClub || "No clubs"}
              ariaLabel="Select club for trend analysis"
            />
          </div>
          <div className="w-full sm:min-w-52">
            <BaseLabel>Metric</BaseLabel>
            <BaseListbox
              options={availableMetrics}
              setOption={setSelectedMetric}
              value={selectedMetric}
              valueText={selectedMetric || "No metrics"}
              ariaLabel="Select metric for trend analysis"
            />
          </div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-gray-500 dark:text-gray-400">Recent avg (3)</p>
          <p className="font-medium text-gray-800 dark:text-gray-100">
            {trend.recentAvg?.toFixed(2) ?? "N/A"}
          </p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400">Previous avg (3)</p>
          <p className="font-medium text-gray-800 dark:text-gray-100">
            {trend.previousAvg?.toFixed(2) ?? "N/A"}
          </p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400">Delta</p>
          <p className="font-medium text-gray-800 dark:text-gray-100">
            {trend.delta === null ? "N/A" : trend.delta.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400">Confidence</p>
          <p className="font-medium text-gray-800 dark:text-gray-100">
            {trend.confidence} ({trend.recentShots} shots)
          </p>
        </div>
      </div>
    </div>
  );
};
