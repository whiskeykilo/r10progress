import { atom, useAtom } from "jotai";
import { useEffect, useRef } from "react";
import { apiGet, apiPut } from "../api";
import { Goal, PartialGoal } from "../types/Goals";
import {
  golfSwingDataKeysInDegrees,
  golfSwingDataKeysInMeters,
} from "../types/GolfSwingData";
import { useAveragedSwings } from "../utils/calculateAverages";
import { useIsEnglishDataset } from "./useIsEnglishDataset.ts";
import { useUnit } from "./useUnit.ts";

export const goalAtom = atom<PartialGoal[]>([]);

const getImplicitClub = (goal: PartialGoal) => {
  if (goal.club) return goal.club;

  const normalizedTitle = goal.title.trim().toLowerCase();
  const isDrivingDistanceGoal = normalizedTitle === "driving distance";
  const isDrivingDistanceMetric =
    goal.metric === "Carry Distance" || goal.metric === "Gesamtstrecke";

  if (isDrivingDistanceGoal && isDrivingDistanceMetric) {
    return "Driver";
  }

  return undefined;
};

export const useGoals: () => Goal[] = () => {
  const isEnglish = useIsEnglishDataset();
  const [goals, setGoals] = useAtom(goalAtom);
  const hasInitializedGoals = useRef(false);

  useEffect(() => {
    if (hasInitializedGoals.current || typeof window === "undefined") return;
    hasInitializedGoals.current = true;

    const defaults: PartialGoal[] = isEnglish
      ? [
        {
          id: "1",
          title: "Driving distance",
          target: 200,
          metric: "Carry Distance",
          direction: "increase" as const,
        },
      ]
      : [
        {
          id: "1",
          title: "Driving distance",
          target: 200,
          metric: "Gesamtstrecke",
          direction: "increase" as const,
        },
      ];

    apiGet<PartialGoal[]>("/api/goals")
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setGoals(data);
          return;
        }
        setGoals(defaults);
      })
      .catch(() => {
        setGoals(defaults);
      });
  }, [isEnglish, setGoals]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hasInitializedGoals.current) return;
    apiPut("/api/goals", goals).catch(console.error);
  }, [goals]);
  const averages = useAveragedSwings();
  const unitSetting = useUnit();

  const calculateGoalProgress = (
    partialGoal: PartialGoal,
    unitSettingValue: string,
  ) => {
    const clubFilter = getImplicitClub(partialGoal);
    const relevantAverages = clubFilter
      ? averages.filter((average) => average.name === clubFilter)
      : averages;

    const metricValues = relevantAverages
      .map(
        (average) =>
          average[partialGoal.metric as keyof typeof average] as
          | number
          | undefined,
      )
      .filter((value): value is number => typeof value === "number");

    const current =
      metricValues.length > 0
        ? metricValues.reduce((sum, value) => sum + value, 0) /
        metricValues.length
        : null;

    const direction = partialGoal.direction ?? "increase";
    const progressRatio =
      current === null || partialGoal.target <= 0
        ? 0
        : direction === "increase"
          ? current / partialGoal.target
          : partialGoal.target / Math.max(current, 0.0001);
    const progress = Math.max(0, Math.min(progressRatio * 100, 100));
    const progressText = `${progress.toFixed(2)}%`;
    let unit = "";
    if (golfSwingDataKeysInDegrees.includes(partialGoal.metric)) {
      unit = "°";
    } else if (golfSwingDataKeysInMeters.includes(partialGoal.metric)) {
      unit = unitSettingValue;
    }
    return { progress, progressText, current, unit, direction };
  };

  return goals.map((goal) => ({
    ...goal,
    ...calculateGoalProgress(goal, unitSetting),
  }));
};
