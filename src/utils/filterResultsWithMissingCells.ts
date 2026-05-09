import { Sessions } from "../types/Sessions";

/** Treat blank/missing CSV cells as empty — but keep numeric 0 and false as real values. */
function isMissingCell(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (value === "") return true;
  if (typeof value === "string" && value.trim() === "") return true;
  return false;
}

export const filterResultsWithMissingCells = (results: Sessions) => {
  return Object.keys(results).reduce((acc, curr) => {
    const session = results[curr];
    const filteredResults = session.results.filter((result) => {
      const keys = Object.keys(result);
      // Papa can emit trailing empty rows; keep all other rows.
      if (keys.length === 0) return false;
      return keys.some(
        (k) => !isMissingCell((result as Record<string, unknown>)[k]),
      );
    });
    acc[curr] = { ...session, results: filteredResults };
    return acc;
  }, {} as Sessions);
};
