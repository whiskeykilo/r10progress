import { atom, useAtom } from "jotai";
import { useEffect, useRef } from "react";
import { Goal, PartialGoal } from "../types/Goals";
import {
  golfSwingDataKeysInDegrees,
  golfSwingDataKeysInMeters,
} from "../types/GolfSwingData";
import { useAveragedSwings } from "../utils/calculateAverages";
import { useIsEnglishDataset } from "./useIsEnglishDataset.ts";
import { useUnit } from "./useUnit.ts";

export const goalAtom = atom<PartialGoal[]>([]);
const GOALS_STORAGE_KEY = "r10progress.goals.v1";

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

    const savedGoals = window.localStorage.getItem(GOALS_STORAGE_KEY);
    if (savedGoals) {
      try {
        const parsed = JSON.parse(savedGoals) as PartialGoal[];
        if (Array.isArray(parsed)) {
          setGoals(parsed);
          return;
        }
      } catch {
        // fall back to defaults below
      }
    }

    const defaults = isEnglish
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
    setGoals(defaults);
  }, [isEnglish, setGoals]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(goals));
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
