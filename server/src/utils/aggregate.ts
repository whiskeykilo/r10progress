// Pure aggregation helpers used to compress raw Garmin R10 shot rows into
// a compact, decision-ready payload for the OpenAI shot analysis prompt.
//
// Keep this module dependency-free (besides Node built-ins) so it can be
// unit-tested with a small Vitest fixture in aggregate.test.ts.

import type { ShotShapeClusterSummary } from "./shotShapeClusters";
import { summarizeShotShapeClusters } from "./shotShapeClusters";

export type RawShot = Record<string, unknown>;

export type Stat = {
  mean: number;
  std: number;
  median: number;
  p10: number;
  p90: number;
} | null;

export type ConfidenceTier = "high" | "medium" | "trend_only";

/** Internal tag on raw shots during analysis-only pipelines (stripped before persistence). */
export const SESSION_FILE_META_KEY = "__r10SessionFile";

export type ClubAggregate = {
  clubName: string;
  clubType: string | null;
  shotCount: number;
  /** KNOWLEDGE.md R10 confidence map × sample sizes × indoor/outdoor mix. */
  metricConfidence: Record<string, ConfidenceTier>;
  carry: Stat;
  total: Stat;
  ballSpeed: Stat;
  clubSpeed: Stat;
  smashFactor: Stat;
  launchAngle: Stat;
  launchDirection: Stat;
  spinRate: Stat;
  backspin: Stat;
  apexHeight: Stat;
  clubFace: Stat;
  clubPath: Stat;
  faceToPath: Stat;
  attackAngle: Stat;
  carryDeviation: Stat;
  totalDeviation: Stat;
  dispersion: {
    ellipse: { width: number; length: number };
    avgOffline: number;
    leftPct: number;
    rightPct: number;
    centeredPct: number;
  };
  flags: {
    pushBias: boolean;
    pullBias: boolean;
    faceOpenBias: boolean;
    faceClosedBias: boolean;
    overTheTop: boolean;
    inconsistentStrike: boolean;
  };
  representativeShots: Array<{
    label: string;
    cs: number | null;
    bs: number | null;
    sf: number | null;
    la: number | null;
    ld: number | null;
    cd: number | null;
    td: number | null;
    sr: number | null;
    cf: number | null;
    cp: number | null;
    f2p: number | null;
  }>;
  /** Signed total deviation: median, IQR, Tukey fence outlier counts. */
  lateralRobust: {
    medianSigned: number;
    iqr: number;
    tukeyLowOutliers: number;
    tukeyHighOutliers: number;
  };
  shotShape: ShotShapeClusterSummary;
};

export type GlobalAggregate = {
  shotsAnalyzed: number;
  clubsUsed: number;
  trendHints: {
    earlyHalf: { avgCarry: number; avgOffline: number; smashStd: number };
    lateHalf: { avgCarry: number; avgOffline: number; smashStd: number };
  } | null;
  topConcerns: string[];
};

export type SessionEnvironmentAgg = "indoor" | "outdoor" | "unknown";

export type ShotAggregate = {
  meta: {
    timeframe: string;
    filename: string;
    totalShots: number;
    outliersDropped: number;
    sessionDateRange: { from: string; to: string } | null;
    environmentMix: {
      indoor: number;
      outdoor: number;
      unknown: number;
    };
    dominantEnvironment: SessionEnvironmentAgg;
    /** Recommended minimum shots before asserting lateral/path/face issues. */
    lateralDiagnosticMinShots: number;
  };
  clubs: ClubAggregate[];
  global: GlobalAggregate;
};

export type AggregateShotsOptions = {
  environmentBySessionFile?: Record<string, SessionEnvironmentAgg>;
};

const CLUB_TYPE_KEYS = [
  "Club Type",
  "Schlägerart",
  "Tipo de palo",
  "Type club",
];
const CLUB_NAME_KEYS = ["Club Name", "Schlägername", "Clubnaam"];
const BALL_SPEED_KEYS = [
  "Ball Speed",
  "Ballgeschwindigkeit",
  "Velocidad de la pelota",
  "Balsnelheid",
];
const CLUB_SPEED_KEYS = ["Club Speed", "Schl.gsch.", "Vel. palo", "Clubsnelh."];
const SMASH_KEYS = [
  "Smash Factor",
  "Smash-Faktor",
  "Calidad del impacto",
  "Smashfactor",
];
const LAUNCH_ANGLE_KEYS = [
  "Launch Angle",
  "Abflugwinkel",
  "Ángulo de lanzamiento",
  "Slaghoek",
];
const LAUNCH_DIR_KEYS = [
  "Launch Direction",
  "Abflugrichtung",
  "Dirección de lanzamiento",
  "Slagrichting",
];
const CARRY_KEYS = [
  "Carry Distance",
  "Carry-Distanz",
  "Dist.​vuelo",
  "Carry-afstand",
];
const TOTAL_KEYS = [
  "Total Distance",
  "Gesamtstrecke",
  "Distan​cia total",
  "Totale afstand",
];
const SPIN_KEYS = [
  "Spin Rate",
  "Drehrate",
  "Velocidad de rotación",
  "Spinsnelheid",
];
const BACKSPIN_KEYS = ["Backspin", "Retroceso"];
const FACE_KEYS = [
  "Club Face",
  "Schlagfläche",
  "Cara del palo",
  "Slagvlak van de club",
];
const PATH_KEYS = [
  "Club Path",
  "Schwungbahn",
  "Línea cabeza del palo",
  "Clubtraject",
];
const F2P_KEYS = [
  "Face to Path",
  "Schlagflächenstellung",
  "Cara a línea",
  "Slagvlak t.o.v. traject",
];
const ATTACK_KEYS = [
  "Attack Angle",
  "Anstellwinkel",
  "Ángulo de ataque",
  "Aanvalshoek",
];
const APEX_KEYS = [
  "Apex Height",
  "Höhe des Scheitelpunkts",
  "Altura máxima",
  "Apexhoogte",
];
const CARRY_DEV_KEYS = [
  "Carry Deviation Distance",
  "Carry-Abweichungsdistanz",
  "Distancia de desviación de vuelo",
  "Carry-afwijkingsafstand",
];
const TOTAL_DEV_KEYS = [
  "Total Deviation Distance",
  "Gesamtabweichungsdistanz",
  "Distancia de desviación total",
  "Totale afwijkingsafstand",
];
const DATE_KEYS = ["Date", "Datum", "Fecha"];

/** Aggregate many shots before diagnosing lateral/path/face (KNOWLEDGE.md). */
export const LATERAL_DIAGNOSTIC_MIN_SHOTS = 25;

const num = (shot: RawShot, keys: string[]): number | null => {
  for (const k of keys) {
    const v = shot[k];
    if (typeof v === "number" && !Number.isNaN(v)) return v;
  }
  return null;
};

const str = (shot: RawShot, keys: string[]): string | null => {
  for (const k of keys) {
    const v = shot[k];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return null;
};

export const quantile = (sortedAsc: number[], q: number): number => {
  if (sortedAsc.length === 0) return 0;
  const pos = (sortedAsc.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sortedAsc[base + 1] !== undefined) {
    return sortedAsc[base] + rest * (sortedAsc[base + 1] - sortedAsc[base]);
  }
  return sortedAsc[base];
};

export const stat = (values: Array<number | null>): Stat => {
  const xs = values.filter(
    (v): v is number => typeof v === "number" && !Number.isNaN(v),
  );
  if (xs.length === 0) return null;
  const sorted = [...xs].sort((a, b) => a - b);
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const variance =
    xs.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(xs.length - 1, 1);
  const std = Math.sqrt(variance);
  return {
    mean: round(mean, 2),
    std: round(std, 2),
    median: round(quantile(sorted, 0.5), 2),
    p10: round(quantile(sorted, 0.1), 2),
    p90: round(quantile(sorted, 0.9), 2),
  };
};

const round = (n: number, dp: number): number => {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
};

// IQR-based outlier filter on Total Distance, computed per club.
// Returns { kept, dropped } so callers can report the drop count.
export const dropOutliers = (
  shots: RawShot[],
): { kept: RawShot[]; dropped: number } => {
  const byClub = new Map<string, number[]>();
  for (const s of shots) {
    const club = str(s, CLUB_TYPE_KEYS) ?? str(s, CLUB_NAME_KEYS);
    const total = num(s, TOTAL_KEYS);
    if (club == null || total == null) continue;
    const arr = byClub.get(club) ?? [];
    arr.push(total);
    byClub.set(club, arr);
  }
  const bounds = new Map<string, { lo: number; hi: number }>();
  for (const [club, vals] of byClub) {
    if (vals.length < 4) {
      // Not enough data to compute IQR meaningfully — keep everything.
      bounds.set(club, { lo: -Infinity, hi: Infinity });
      continue;
    }
    const sorted = [...vals].sort((a, b) => a - b);
    const q1 = quantile(sorted, 0.25);
    const q3 = quantile(sorted, 0.75);
    const iqr = q3 - q1;
    bounds.set(club, { lo: q1 - 1.5 * iqr, hi: q3 + 1.5 * iqr });
  }
  const kept: RawShot[] = [];
  let dropped = 0;
  for (const s of shots) {
    const club = str(s, CLUB_TYPE_KEYS) ?? str(s, CLUB_NAME_KEYS);
    const total = num(s, TOTAL_KEYS);
    if (club == null || total == null) {
      // Keep shots we can't classify — better to give the model partial data
      // than to silently drop rows the user paid attention to.
      kept.push(s);
      continue;
    }
    const b = bounds.get(club)!;
    if (total >= b.lo && total <= b.hi) kept.push(s);
    else dropped++;
  }
  return { kept, dropped };
};

// 95% CI dispersion ellipse (lateral × depth) computed in launch-monitor space.
// Mirrors the frontend's calculateDispersionEllipse semantics so the numbers
// the model sees match the numbers shown in the UI.
const dispersionEllipse = (
  shots: RawShot[],
): { width: number; length: number } => {
  const points = shots
    .map((s) => {
      const distance = num(s, TOTAL_KEYS);
      const deviation = num(s, TOTAL_DEV_KEYS) ?? 0;
      if (distance == null) return null;
      const angle = Math.atan2(deviation, distance);
      return { x: distance * Math.cos(angle), y: distance * Math.sin(angle) };
    })
    .filter((p): p is { x: number; y: number } => p !== null);
  if (points.length === 0) return { width: 0, length: 0 };
  const cx = points.reduce((a, p) => a + p.x, 0) / points.length;
  const cy = points.reduce((a, p) => a + p.y, 0) / points.length;
  const ci = 1.96 * 2;
  const xMax = Math.max(...points.map((p) => Math.abs(p.x - cx)));
  const yMax = Math.max(...points.map((p) => Math.abs(p.y - cy)));
  return { width: round(yMax * ci, 2), length: round(xMax * ci, 2) };
};

const pickRepresentative = (
  shots: RawShot[],
): ClubAggregate["representativeShots"] => {
  if (shots.length === 0) return [];
  const compact = (s: RawShot, label: string) => ({
    label,
    cs: num(s, CLUB_SPEED_KEYS),
    bs: num(s, BALL_SPEED_KEYS),
    sf: num(s, SMASH_KEYS),
    la: num(s, LAUNCH_ANGLE_KEYS),
    ld: num(s, LAUNCH_DIR_KEYS),
    cd: num(s, CARRY_KEYS),
    td: num(s, TOTAL_KEYS),
    sr: num(s, SPIN_KEYS),
    cf: num(s, FACE_KEYS),
    cp: num(s, PATH_KEYS),
    f2p: num(s, F2P_KEYS),
  });
  const withTotal = shots.filter((s) => num(s, TOTAL_KEYS) != null);
  if (withTotal.length === 0) return [];
  const longest = [...withTotal].sort(
    (a, b) => num(b, TOTAL_KEYS)! - num(a, TOTAL_KEYS)!,
  )[0];
  const shortest = [...withTotal].sort(
    (a, b) => num(a, TOTAL_KEYS)! - num(b, TOTAL_KEYS)!,
  )[0];
  const offlineL = [...shots].sort(
    (a, b) => (num(a, TOTAL_DEV_KEYS) ?? 0) - (num(b, TOTAL_DEV_KEYS) ?? 0),
  )[0];
  const offlineR = [...shots].sort(
    (a, b) => (num(b, TOTAL_DEV_KEYS) ?? 0) - (num(a, TOTAL_DEV_KEYS) ?? 0),
  )[0];
  const lowSmash = [...shots]
    .filter((s) => num(s, SMASH_KEYS) != null)
    .sort((a, b) => num(a, SMASH_KEYS)! - num(b, SMASH_KEYS)!)[0];

  const picks: Array<[RawShot | undefined, string]> = [
    [longest, "longest"],
    [shortest, "shortest"],
    [offlineL, "most-offline-left"],
    [offlineR, "most-offline-right"],
    [lowSmash, "lowest-smash"],
  ];
  // Dedup by reference — small samples can overlap (e.g. only 2 shots in a club).
  const seen = new Set<RawShot>();
  const out: ClubAggregate["representativeShots"] = [];
  for (const [s, label] of picks) {
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(compact(s, label));
  }
  return out;
};

const computeEnvironmentMix = (
  shots: RawShot[],
  envByFile: Record<string, SessionEnvironmentAgg> | undefined,
): {
  mix: { indoor: number; outdoor: number; unknown: number };
  dominant: SessionEnvironmentAgg;
  indoorHeavy: boolean;
} => {
  let indoor = 0;
  let outdoor = 0;
  let unknown = 0;
  for (const s of shots) {
    const file = s[SESSION_FILE_META_KEY];
    const key = typeof file === "string" ? file : "";
    const env =
      key && envByFile && envByFile[key] ? envByFile[key]! : "unknown";
    if (env === "indoor") indoor++;
    else if (env === "outdoor") outdoor++;
    else unknown++;
  }
  const mix = { indoor, outdoor, unknown };
  const max = Math.max(indoor, outdoor, unknown);
  const dominant: SessionEnvironmentAgg =
    max === 0
      ? "unknown"
      : indoor === max
        ? "indoor"
        : outdoor === max
          ? "outdoor"
          : "unknown";
  const indoorHeavy =
    mix.indoor + mix.outdoor > 0 ? mix.indoor > mix.outdoor : false;
  return { mix, dominant, indoorHeavy };
};

const lateralConfidenceTier = (
  shotCount: number,
  indoorHeavy: boolean,
): ConfidenceTier => {
  if (shotCount < LATERAL_DIAGNOSTIC_MIN_SHOTS) return "trend_only";
  if (indoorHeavy) return "trend_only";
  return "medium";
};

const spinConfidenceTier = (
  shotCount: number,
  indoorHeavy: boolean,
): ConfidenceTier => {
  if (indoorHeavy) return "trend_only";
  if (shotCount < 15) return "trend_only";
  return "medium";
};

const carryConfidenceTier = (indoorHeavy: boolean): ConfidenceTier =>
  indoorHeavy ? "medium" : "high";

const buildMetricConfidence = (
  shotCount: number,
  indoorHeavy: boolean,
): Record<string, ConfidenceTier> => {
  const lat = lateralConfidenceTier(shotCount, indoorHeavy);
  const spin = spinConfidenceTier(shotCount, indoorHeavy);
  const carry = carryConfidenceTier(indoorHeavy);
  return {
    ballSpeed: "high",
    clubSpeed: "high",
    smashFactor: "high",
    carryDistance: carry,
    totalDistance: carry,
    launchAngle: indoorHeavy ? "medium" : "high",
    launchDirection: lat,
    spinRate: spin,
    backspin: spin,
    apexHeight: spin,
    clubPath: lat,
    clubFace: lat,
    faceToPath: lat,
    attackAngle: lat,
    carryDeviation: lat,
    totalDeviation: lat,
  };
};

const aggregateClub = (
  clubName: string,
  shots: RawShot[],
  indoorHeavy: boolean,
): ClubAggregate => {
  const totalDevs = shots
    .map((s) => num(s, TOTAL_DEV_KEYS))
    .filter((v): v is number => v != null);
  const avgOffline =
    totalDevs.length > 0
      ? totalDevs.reduce((a, b) => a + Math.abs(b), 0) / totalDevs.length
      : 0;
  const left = totalDevs.filter((v) => v < -1).length;
  const right = totalDevs.filter((v) => v > 1).length;
  const centered = totalDevs.filter((v) => Math.abs(v) <= 5).length;
  const denom = Math.max(totalDevs.length, 1);

  const sortedDevs = [...totalDevs].sort((a, b) => a - b);
  let tukeyLow = 0;
  let tukeyHigh = 0;
  let iqrSigned = 0;
  let medianSigned = 0;
  if (sortedDevs.length >= 4) {
    const q1 = quantile(sortedDevs, 0.25);
    const q3 = quantile(sortedDevs, 0.75);
    const iqr = q3 - q1;
    iqrSigned = round(iqr, 2);
    medianSigned = round(quantile(sortedDevs, 0.5), 2);
    const lo = q1 - 1.5 * iqr;
    const hi = q3 + 1.5 * iqr;
    for (const v of sortedDevs) {
      if (v < lo) tukeyLow++;
      if (v > hi) tukeyHigh++;
    }
  } else if (sortedDevs.length > 0) {
    medianSigned = round(quantile(sortedDevs, 0.5), 2);
  }

  const shotShape = summarizeShotShapeClusters(shots);

  const clubFaceStat = stat(shots.map((s) => num(s, FACE_KEYS)));
  const clubPathStat = stat(shots.map((s) => num(s, PATH_KEYS)));
  const attackStat = stat(shots.map((s) => num(s, ATTACK_KEYS)));
  const smashStat = stat(shots.map((s) => num(s, SMASH_KEYS)));
  /** Path/face/OTT flags defer until enough outdoor-weighted lateral signal. */
  const lateralStructuralOk =
    shots.length >= LATERAL_DIAGNOSTIC_MIN_SHOTS && !indoorHeavy;
  const metricConfidence = buildMetricConfidence(shots.length, indoorHeavy);

  return {
    clubName,
    clubType: str(shots[0] ?? {}, CLUB_TYPE_KEYS),
    shotCount: shots.length,
    metricConfidence,
    carry: stat(shots.map((s) => num(s, CARRY_KEYS))),
    total: stat(shots.map((s) => num(s, TOTAL_KEYS))),
    ballSpeed: stat(shots.map((s) => num(s, BALL_SPEED_KEYS))),
    clubSpeed: stat(shots.map((s) => num(s, CLUB_SPEED_KEYS))),
    smashFactor: smashStat,
    launchAngle: stat(shots.map((s) => num(s, LAUNCH_ANGLE_KEYS))),
    launchDirection: stat(shots.map((s) => num(s, LAUNCH_DIR_KEYS))),
    spinRate: stat(shots.map((s) => num(s, SPIN_KEYS))),
    backspin: stat(shots.map((s) => num(s, BACKSPIN_KEYS))),
    apexHeight: stat(shots.map((s) => num(s, APEX_KEYS))),
    clubFace: clubFaceStat,
    clubPath: clubPathStat,
    faceToPath: stat(shots.map((s) => num(s, F2P_KEYS))),
    attackAngle: attackStat,
    carryDeviation: stat(shots.map((s) => num(s, CARRY_DEV_KEYS))),
    totalDeviation: stat(totalDevs),
    dispersion: {
      ellipse: dispersionEllipse(shots),
      avgOffline: round(avgOffline, 2),
      leftPct: round((left / denom) * 100, 1),
      rightPct: round((right / denom) * 100, 1),
      centeredPct: round((centered / denom) * 100, 1),
    },
    flags: {
      pushBias: lateralStructuralOk && (clubPathStat?.mean ?? 0) > 2,
      pullBias: lateralStructuralOk && (clubPathStat?.mean ?? 0) < -2,
      faceOpenBias: lateralStructuralOk && (clubFaceStat?.mean ?? 0) > 2,
      faceClosedBias: lateralStructuralOk && (clubFaceStat?.mean ?? 0) < -2,
      overTheTop:
        lateralStructuralOk &&
        (clubPathStat?.mean ?? 0) < -2 &&
        (attackStat?.mean ?? 0) < -2,
      inconsistentStrike: (smashStat?.std ?? 0) > 0.05,
    },
    representativeShots: pickRepresentative(shots),
    lateralRobust: {
      medianSigned,
      iqr: iqrSigned,
      tukeyLowOutliers: tukeyLow,
      tukeyHighOutliers: tukeyHigh,
    },
    shotShape: shotShape,
  };
};

const computeTrendHints = (shots: RawShot[]): GlobalAggregate["trendHints"] => {
  if (shots.length < 20) return null;
  const withDate = shots
    .map((s) => ({ shot: s, date: str(s, DATE_KEYS) }))
    .filter((x): x is { shot: RawShot; date: string } => x.date != null);
  if (withDate.length < 20) return null;
  withDate.sort((a, b) => a.date.localeCompare(b.date));
  const mid = Math.floor(withDate.length / 2);
  const half = (slice: typeof withDate) => {
    const carries = slice
      .map((x) => num(x.shot, CARRY_KEYS))
      .filter((v): v is number => v != null);
    const offsets = slice
      .map((x) => num(x.shot, TOTAL_DEV_KEYS))
      .filter((v): v is number => v != null)
      .map(Math.abs);
    const smashStat = stat(slice.map((x) => num(x.shot, SMASH_KEYS)));
    const avg = (xs: number[]) =>
      xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;
    return {
      avgCarry: round(avg(carries), 2),
      avgOffline: round(avg(offsets), 2),
      smashStd: round(smashStat?.std ?? 0, 3),
    };
  };
  return {
    earlyHalf: half(withDate.slice(0, mid)),
    lateHalf: half(withDate.slice(mid)),
  };
};

const computeTopConcerns = (clubs: ClubAggregate[]): string[] => {
  const concerns: Array<{ score: number; msg: string }> = [];
  for (const c of clubs) {
    if (c.flags.overTheTop) {
      concerns.push({
        score: 100,
        msg: `${c.clubName}: over-the-top tendency (path ${c.clubPath?.mean}, attack ${c.attackAngle?.mean})`,
      });
    }
    if (c.flags.inconsistentStrike && c.smashFactor) {
      concerns.push({
        score: 80,
        msg: `${c.clubName}: inconsistent strike (smash std ${c.smashFactor.std})`,
      });
    }
    if (c.dispersion.ellipse.width > 30 && c.shotCount >= 5) {
      concerns.push({
        score: 60 + Math.min(c.dispersion.ellipse.width, 100),
        msg: `${c.clubName}: wide dispersion ${c.dispersion.ellipse.width}x${c.dispersion.ellipse.length}`,
      });
    }
    if (c.flags.faceOpenBias) {
      concerns.push({
        score: 50,
        msg: `${c.clubName}: face-open bias (${c.clubFace?.mean})`,
      });
    }
    if (c.flags.faceClosedBias) {
      concerns.push({
        score: 50,
        msg: `${c.clubName}: face-closed bias (${c.clubFace?.mean})`,
      });
    }
    if (c.shotShape.pattern === "two_way" && c.shotCount >= 10) {
      concerns.push({
        score: 58,
        msg: `${c.clubName}: two-way face-to-path pattern (mixed draw/fade delivery)`,
      });
    }
  }
  return concerns
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((c) => c.msg);
};

const sessionDateRange = (
  shots: RawShot[],
): { from: string; to: string } | null => {
  const dates = shots
    .map((s) => str(s, DATE_KEYS))
    .filter((d): d is string => d != null)
    .sort();
  if (dates.length === 0) return null;
  return { from: dates[0], to: dates[dates.length - 1] };
};

export const aggregateShots = (
  shots: RawShot[],
  meta: { timeframe: string; filename: string },
  options?: AggregateShotsOptions,
): ShotAggregate => {
  const totalShots = shots.length;
  const { kept, dropped } = dropOutliers(shots);

  const { mix, dominant, indoorHeavy } = computeEnvironmentMix(
    kept,
    options?.environmentBySessionFile,
  );

  const byClub = new Map<string, RawShot[]>();
  for (const s of kept) {
    const club = str(s, CLUB_TYPE_KEYS) ?? str(s, CLUB_NAME_KEYS) ?? "Unknown";
    const arr = byClub.get(club) ?? [];
    arr.push(s);
    byClub.set(club, arr);
  }

  const clubs: ClubAggregate[] = [];
  for (const [clubName, clubShots] of byClub) {
    clubs.push(aggregateClub(clubName, clubShots, indoorHeavy));
  }
  clubs.sort((a, b) => b.shotCount - a.shotCount);

  return {
    meta: {
      timeframe: meta.timeframe,
      filename: meta.filename,
      totalShots,
      outliersDropped: dropped,
      sessionDateRange: sessionDateRange(kept),
      environmentMix: mix,
      dominantEnvironment: dominant,
      lateralDiagnosticMinShots: LATERAL_DIAGNOSTIC_MIN_SHOTS,
    },
    clubs,
    global: {
      shotsAnalyzed: kept.length,
      clubsUsed: clubs.length,
      trendHints: computeTrendHints(kept),
      topConcerns: computeTopConcerns(clubs),
    },
  };
};
