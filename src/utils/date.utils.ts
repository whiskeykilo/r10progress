import type { GolfSwingData } from "../types/GolfSwingData";
import { getDate } from "./golfSwingData.helpers";

function rowHasShotDate(row: unknown): boolean {
  const raw = getDate(row as GolfSwingData);
  return typeof raw === "string" && raw.trim().length > 0;
}

/**
 * Session label date from the first shot row that has a real Date/Datum/Fecha.
 * Garmin CSVs often include a leading units row (Date null, "[mph]", etc.) — skip those.
 */
export const getDateFromResults = (results: unknown[]): string => {
  for (const row of results) {
    if (!rowHasShotDate(row)) continue;
    const raw = getDate(row as GolfSwingData) as string;
    const dayPart = raw.trim().split(/\s+/)[0] ?? raw.trim();
    return dayPart;
  }
  return "";
};

export const getDayFromRow = (row: unknown): string => {
  if (!rowHasShotDate(row)) return "";
  const raw = getDate(row as GolfSwingData) as string;
  return raw.trim().split(/\s+/)[0] ?? "";
};
