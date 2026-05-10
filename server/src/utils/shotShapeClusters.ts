import type { RawShot } from "./aggregate";

const F2P_KEYS = [
  "Face to Path",
  "Schlagflächenstellung",
  "Cara a línea",
  "Slagvlak t.o.v. traject",
];

export type ShotShapeClusterSummary = {
  pattern: "two_way" | "fade_bias" | "draw_bias" | "neutral";
  closedToPathCount: number;
  openToPathCount: number;
  neutralCount: number;
};

const THRESHOLD_DEG = 1.5;

function readNum(shot: RawShot, keys: string[]): number | null {
  for (const k of keys) {
    const v = shot[k];
    if (typeof v === "number" && !Number.isNaN(v)) return v;
  }
  return null;
}

/**
 * Deterministic bucketing by face-to-path sign (no random seed needed).
 */
export function summarizeShotShapeClusters(
  shots: RawShot[],
): ShotShapeClusterSummary {
  let closedToPathCount = 0;
  let openToPathCount = 0;
  let neutralCount = 0;

  for (const s of shots) {
    const f2p = readNum(s, F2P_KEYS);
    if (f2p == null) {
      neutralCount++;
      continue;
    }
    if (f2p < -THRESHOLD_DEG) closedToPathCount++;
    else if (f2p > THRESHOLD_DEG) openToPathCount++;
    else neutralCount++;
  }

  const total = shots.length || 1;
  const openShare = openToPathCount / total;
  const closedShare = closedToPathCount / total;

  let pattern: ShotShapeClusterSummary["pattern"] = "neutral";
  if (openShare >= 0.25 && closedShare >= 0.25) pattern = "two_way";
  else if (openShare > closedShare && openShare >= 0.35) pattern = "fade_bias";
  else if (closedShare > openShare && closedShare >= 0.35)
    pattern = "draw_bias";

  return {
    pattern,
    closedToPathCount,
    openToPathCount,
    neutralCount,
  };
}
