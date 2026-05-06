import { useAtom } from "jotai";
import { useContext, useEffect, useMemo } from "react";
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

export const GoalForm = ({
  closeAction,
  initialTitle = "",
}: {
  closeAction: () => void;
  initialTitle?: string;
}) => {
  const createGoalId = () => {
    if (
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
    ) {
      return crypto.randomUUID();
    }
    return `goal-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
  };

  const formMethods = useForm<{
    title: string;
    target: number;
    club?: string;
    metric: keyof GolfSwingDataDE | keyof GolfSwingDataEN;
    direction: "increase" | "decrease";
  }>({
    defaultValues: {
      title: initialTitle,
      direction: "increase",
      club: "",
    },
  });

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

  useEffect(() => {
    const currentMetric = formMethods.getValues("metric");
    // #region agent log
    fetch("http://127.0.0.1:7481/ingest/1d3bc7a3-f12b-4abd-b89d-767471458aa7", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "17fcd8",
      },
      body: JSON.stringify({
        sessionId: "17fcd8",
        runId: "pre-fix",
        hypothesisId: "H4",
        location: "src/views/GoalForm.tsx:useEffect(metricOptions)",
        message: "Goal metric options evaluated",
        data: {
          metricOptionsCount: metricOptions.length,
          currentMetric: currentMetric ?? null,
          isEnglish,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    if (!currentMetric && metricOptions.length > 0) {
      formMethods.setValue("metric", metricOptions[0], {
        shouldValidate: true,
      });
    }
  }, [formMethods, isEnglish, metricOptions]);
  return (
    <div className="mt-4 rounded-md bg-white p-4 dark:bg-gray-800">
      <form
        onSubmit={formMethods.handleSubmit((data) => {
          // #region agent log
          fetch(
            "http://127.0.0.1:7481/ingest/1d3bc7a3-f12b-4abd-b89d-767471458aa7",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-Debug-Session-Id": "17fcd8",
              },
              body: JSON.stringify({
                sessionId: "17fcd8",
                runId: "pre-fix",
                hypothesisId: "H5",
                location: "src/views/GoalForm.tsx:onSubmit",
                message: "Goal submission payload",
                data: {
                  titleRaw: data.title,
                  titleTrimmed: data.title.trim(),
                  target: data.target,
                  targetIsFinite: Number.isFinite(data.target),
                  metric: data.metric,
                  direction: data.direction,
                  club: data.club || null,
                },
                timestamp: Date.now(),
              }),
            },
          ).catch(() => {});
          // #endregion
          setGoals((goals) => [
            ...goals,
            {
              id: createGoalId(),
              title: data.title.trim(),
              target: data.target,
              metric: data.metric,
              club: data.club || undefined,
              direction: data.direction,
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
            defaultValue={initialTitle}
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
            <option value="">All clubs</option>
            {Object.keys(clubs).map((club) => (
              <option key={club} value={club}>
                {club}
              </option>
            ))}
          </select>

          <label htmlFor="goal-direction" className="sr-only">
            Goal direction
          </label>
          <select
            id="goal-direction"
            aria-label="Goal direction"
            {...formMethods.register("direction", { required: true })}
            className="input w-full"
            defaultValue="increase"
          >
            <option value="increase">Increase this metric</option>
            <option value="decrease">Decrease this metric</option>
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
            {...formMethods.register("target", {
              required: true,
              valueAsNumber: true,
            })}
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
