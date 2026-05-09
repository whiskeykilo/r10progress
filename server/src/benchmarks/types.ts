/** Sources referenced in KNOWLEDGE.md and TrackMan public materials. */
export type BenchmarkVersion = {
  id: string;
  label: string;
  citations: string[];
};

export type HandicapBucket =
  | "scratch_5"
  | "hcp_5_10"
  | "hcp_10_15"
  | "hcp_15_20"
  | "hcp_20_plus";

export function handicapIndexToBucket(h: number): HandicapBucket {
  if (h <= 5) return "scratch_5";
  if (h <= 10) return "hcp_5_10";
  if (h <= 15) return "hcp_10_15";
  if (h <= 20) return "hcp_15_20";
  return "hcp_20_plus";
}
