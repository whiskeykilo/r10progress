import { useAtom } from "jotai";
import { useContext, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useClubsPerSession } from "../hooks/useClubsPerSesssion";
import { goalAtom } from "../hooks/useGoals";
import { useIsEnglishDataset } from "../hooks/useIsEnglishDataset.ts";
import { useUnit } from "../hooks/useUnit.ts";
import { SessionContext } from "../provider/SessionContext";
import {
  GolfSwingDataDE,
  GolfSwingDataEN,
  englishDegreeMetrics,
  englishMetersMetrics,
  germanDegreeMetrics,
  germanMetersMetrics,
  golfSwingDataKeysInMeters,
  nonNumericGolfSwingDataKeys,
} from "../types/GolfSwingData";
import { getAllDataFromSession } from "../utils/getAllDataFromSession";

export const GoalForm = ({ closeAction }: { closeAction: () => void }) => {
  const formMethods = useForm<{
    title: string;
    target: number;
    club?: string;
    metric: keyof GolfSwingDataDE | keyof GolfSwingDataEN;
  }>();

  const isEnglish = useIsEnglishDataset();
  const unit = useUnit();
  const { sessions } = useContext(SessionContext);
  const metricOptions = useMemo(() => {
    const metricOptionsBase = isEnglish
      ? [...englishDegreeMetrics, ...englishMetersMetrics]
      : [...germanDegreeMetrics, ...germanMetersMetrics];

    if (!sessions) return metricOptionsBase;

    const allData = getAllDataFromSession(sessions);
    if (allData.length === 0) return metricOptionsBase;

    const availableNumericFields = new Set<string>();
    allData.forEach((row) => {
      Object.entries(row).forEach(([key, value]) => {
        if (
          !nonNumericGolfSwingDataKeys.includes(
            key as keyof (GolfSwingDataEN & GolfSwingDataDE),
          ) &&
          typeof value === "number" &&
          Number.isFinite(value)
        ) {
          availableNumericFields.add(key);
        }
      });
    });

    const filtered = metricOptionsBase.filter((metric) =>
      availableNumericFields.has(metric),
    );
    return filtered.length > 0 ? filtered : metricOptionsBase;
  }, [sessions, isEnglish]);
  const [, setGoals] = useAtom(goalAtom);
  const clubs = useClubsPerSession();
  const selectedMetric = formMethods.watch("metric");
  return (
    <div className="mt-4 rounded-md bg-white p-4 dark:bg-gray-800">
      <form
        onSubmit={formMethods.handleSubmit((data) => {
          setGoals((goals) => [
            ...goals,
            {
              id: crypto.randomUUID(),
              title: data.title,
              target: data.target,
              metric: data.metric,
            },
          ]);
          closeAction();
        })}
      >
        <div className="flex flex-wrap gap-4">
          <label htmlFor="goal-title" className="sr-only">
            Goal title
          </label>
          <input
            id="goal-title"
            type="text"
            placeholder="Title"
            aria-label="Goal title"
            autoComplete="off"
            {...formMethods.register("title", { required: true })}
            className="input w-full"
          />

          <label htmlFor="goal-metric" className="sr-only">
            Goal metric
          </label>
          <select
            id="goal-metric"
            aria-label="Goal metric"
            {...formMethods.register("metric", { required: true })}
            className="input w-full"
          >
            {metricOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          <label htmlFor="goal-club" className="sr-only">
            Club filter
          </label>
          <select
            id="goal-club"
            aria-label="Club filter"
            {...formMethods.register("club")}
            className="input w-full"
            defaultValue=""
          >
            {Object.keys(clubs).map((club) => (
              <option key={club} value={club}>
                {club}
              </option>
            ))}
            <option value="">All clubs</option>
          </select>

          <label htmlFor="goal-target" className="sr-only">
            Target value
          </label>
          <input
            id="goal-target"
            type="number"
            placeholder={`Target (${
              golfSwingDataKeysInMeters.includes(selectedMetric) ? unit : "°"
            })`}
            aria-label="Target value"
            {...formMethods.register("target", { required: true })}
            className="input w-full"
          />
        </div>
        <button type="submit" className="btn mt-4 w-full">
          Add goal
        </button>
      </form>
    </div>
  );
};
