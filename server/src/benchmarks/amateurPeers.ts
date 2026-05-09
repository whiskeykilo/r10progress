import type { BenchmarkVersion } from "./types";
import { handicapIndexToBucket, type HandicapBucket } from "./types";

/**
 * Average driving distance (total / carry style yardages) by handicap — approximate
 * peer lines from population studies cited in KNOWLEDGE.md (Arccos / Shot Scope summaries).
 */
export const AMATEUR_DRIVE_YARDS: BenchmarkVersion = {
  id: "amateur-drive-2024-knowledge",
  label: "Amateur driving distance by handicap (approximate)",
  citations: [
    "KNOWLEDGE.md §4 Population benchmarks — Practical Golf / Arccos summaries",
    "https://practical-golf.com/average-driving-distance-handicap-age",
  ],
};

/** Midpoint approximate average drive in yards per bucket */
const AVG_DRIVE_BY_BUCKET: Record<HandicapBucket, number> = {
  scratch_5: 245,
  hcp_5_10: 235,
  hcp_10_15: 225,
  hcp_15_20: 215,
  hcp_20_plus: 200,
};

export function peerAverageDriveYards(handicapIndex: number | null): number {
  if (handicapIndex == null || handicapIndex < 0) {
    return AVG_DRIVE_BY_BUCKET.hcp_10_15;
  }
  const cap = Math.min(Math.max(handicapIndex, 0), 36);
  return AVG_DRIVE_BY_BUCKET[handicapIndexToBucket(cap)];
}

/**
 * Heuristic peer 7-iron carry midpoint (yards) anchored to KNOWLEDGE.md dispersion
 * examples and handicap distance ladders ( Practical Golf summaries ).
 */
export function peerApproxSevenIronCarry(handicapIndex: number | null): number {
  if (handicapIndex == null || handicapIndex < 0) return 138;
  const h = Math.min(Math.max(handicapIndex, 0), 36);
  if (h <= 5) return 160;
  if (h <= 10) return 145;
  if (h <= 15) return 135;
  if (h <= 20) return 125;
  return 115;
}
