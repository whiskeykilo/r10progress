import { useMemo } from "react";
import { useUnit } from "../../hooks/useUnit";
import { useAveragePerSession } from "../../utils/calculateAverages";
import { parseDate } from "../../utils/utils";

type ClubDelta = {
  club: string;
  recent: number;
  baseline: number;
  delta: number;
};

export const PreRoundSummary = () => {
  const unit = useUnit();
  const perSession = useAveragePerSession();

  const summary = useMemo(() => {
    const sorted = [...perSession].sort((a, b) =>
      parseDate(a.date).localeCompare(parseDate(b.date)),
    );
    const recent = sorted.slice(-3);
    if (recent.length < 2) return { hot: [], cold: [] as ClubDelta[] };

    const latest = recent[recent.length - 1];
    const previous = recent.slice(0, -1);

    const changes = latest.averages
      .map((club) => {
        const latestCarry =
          typeof club["Carry Distance"] === "number"
            ? club["Carry Distance"]
            : null;
        if (latestCarry === null) return null;

        const baselineValues = previous
          .map((session) =>
            session.averages.find((entry) => entry.name === club.name),
          )
          .map((entry) =>
            entry && typeof entry["Carry Distance"] === "number"
              ? entry["Carry Distance"]
              : null,
          )
          .filter((value): value is number => value !== null);
        if (!baselineValues.length) return null;

        const baseline =
          baselineValues.reduce((sum, value) => sum + value, 0) /
          baselineValues.length;
        const delta = latestCarry - baseline;
        return { club: club.name, recent: latestCarry, baseline, delta };
      })
      .filter((value): value is ClubDelta => value !== null)
      .sort((a, b) => b.delta - a.delta);

    return {
      hot: changes.filter((entry) => entry.delta >= 0).slice(0, 3),
      cold: [...changes]
        .reverse()
        .filter((entry) => entry.delta < 0)
        .slice(0, 3),
    };
  }, [perSession]);

  return (
    <section className="rounded-xl bg-white p-4 dark:bg-gray-800">
      <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
        Pre-Round: What’s Working
      </h4>
      <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
        Snapshot from your last 3 sessions. Compare latest carry against recent
        baseline to pick safe clubs for today.
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <p className="mb-2 text-sm font-medium text-green-700 dark:text-green-300">
            Hot clubs
          </p>
          <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-200">
            {summary.hot.length ? (
              summary.hot.map((entry) => (
                <li key={entry.club}>
                  {entry.club}: {entry.recent.toFixed(1)} {unit} (
                  {entry.delta >= 0 ? "+" : ""}
                  {entry.delta.toFixed(1)})
                </li>
              ))
            ) : (
              <li>Not enough data yet.</li>
            )}
          </ul>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-amber-700 dark:text-amber-300">
            Cold clubs
          </p>
          <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-200">
            {summary.cold.length ? (
              summary.cold.map((entry) => (
                <li key={entry.club}>
                  {entry.club}: {entry.recent.toFixed(1)} {unit} (
                  {entry.delta.toFixed(1)})
                </li>
              ))
            ) : (
              <li>No negative trend detected.</li>
            )}
          </ul>
        </div>
      </div>
    </section>
  );
};
