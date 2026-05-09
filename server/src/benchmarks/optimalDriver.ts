import type { BenchmarkVersion } from "./types";

export const OPTIMAL_DRIVER_WINDOWS: BenchmarkVersion = {
  id: "optimal-driver-knowledge",
  label: "Driver launch/spin windows by club speed (KNOWLEDGE.md)",
  citations: ["KNOWLEDGE.md §3 Optimal launch conditions — driver"],
};

export type DriverWindow = {
  launchMin: number;
  launchMax: number;
  spinMin: number;
  spinMax: number;
};

export function driverWindowForClubSpeedMph(cs: number): DriverWindow {
  if (cs < 90)
    return { launchMin: 13, launchMax: 15, spinMin: 2800, spinMax: 3200 };
  if (cs < 100)
    return { launchMin: 12, launchMax: 14, spinMin: 2500, spinMax: 2900 };
  if (cs < 110)
    return { launchMin: 11, launchMax: 13, spinMin: 2300, spinMax: 2700 };
  return { launchMin: 10, launchMax: 11, spinMin: 2300, spinMax: 2800 };
}
