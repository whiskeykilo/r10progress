import {
  AMATEUR_DRIVE_YARDS,
  driverWindowForClubSpeedMph,
  peerApproxSevenIronCarry,
  peerAverageDriveYards,
  TRACKMAN_TOUR_2024,
} from "../benchmarks";
import type { ClubAggregate, ConfidenceTier, ShotAggregate } from "./aggregate";
import { LATERAL_DIAGNOSTIC_MIN_SHOTS } from "./aggregate";
import { sampleTierForCount } from "./recommendationGuardrails";

export type SgCategory = "approach" | "offTheTee" | "aroundGreen" | "putting";

export type UiConfidence = "high" | "medium" | "low";

export type SgDrill = {
  name: string;
  focus: string;
  steps: string[];
};

export type SgFindingTag = "strategy" | "mechanics";

export type SgRecommendation = {
  rank: number;
  category: SgCategory;
  title: string;
  rationale: string;
  estimatedSgPerRound: number;
  confidenceLabel: UiConfidence;
  evidenceLines: string[];
  supportingMetrics: Array<{ label: string; value: string }>;
  drill: SgDrill;
  tag: SgFindingTag;
};

export type SgFirstPlan = {
  benchmarkVersionNote: string;
  environmentNote: string;
  handicapNote: string;
  recommendations: SgRecommendation[];
};

const tierMultiplier = (tier: ConfidenceTier): number => {
  if (tier === "high") return 1;
  if (tier === "medium") return 0.65;
  return 0.35;
};

const toUiConfidence = (
  tiers: ConfidenceTier[],
  estimatedSg: number,
): UiConfidence => {
  const penalized = tiers.every((t) => t === "high")
    ? 1
    : tiers.every((t) => t !== "trend_only")
      ? 0.75
      : 0.4;
  if (estimatedSg * penalized >= 0.75 && tiers.includes("high")) return "high";
  if (estimatedSg * penalized >= 0.35) return "medium";
  return "low";
};

const normalizeClub = (name: string) =>
  name.toLowerCase().replace(/\s+/g, " ").trim();

const getClub = (
  agg: ShotAggregate,
  matcher: RegExp | ((n: string) => boolean),
): ClubAggregate | undefined =>
  agg.clubs.find((c) =>
    typeof matcher === "function"
      ? matcher(c.clubName)
      : matcher.test(normalizeClub(c.clubName)),
  );

function approachDrill(title: string): SgDrill {
  return {
    name: "Approach ladders",
    focus: title.includes("iron")
      ? "Carry accuracy from your stock iron distances"
      : "Approach distance control",
    steps: [
      "Pick three carry targets (short / mid / long) for one club.",
      "Hit five balls each; track carry offline and average carry vs target.",
      "Stop when fifteen shots land inside a six-yard corridor — repeat next session.",
    ],
  };
}

function ottDrill(): SgDrill {
  return {
    name: "Start-line + face control tee block",
    focus: "Driving efficiency without chasing spin tweaks indoors",
    steps: [
      "Use an alignment stick for start line visual; exaggerate centered face feel.",
      "Alternate full swings with nines — watch ball-speed stability (measurable R10 strengths).",
      "End on ten swings trying to tighten launch-direction std vs prior block.",
    ],
  };
}

/**
 * KNOWLEDGE.md: Approach play is typically the dominant amateur leverage point;
 * we still score driver distance/leaks when materially below peer handicap lines.
 */
export function buildSgFirstPlan(params: {
  aggregate: ShotAggregate;
  handicapIndex: number | null;
  indoorHeavy: boolean;
}): SgFirstPlan {
  const { aggregate, handicapIndex, indoorHeavy } = params;

  const env = aggregate.meta.dominantEnvironment;
  const mix = aggregate.meta.environmentMix;
  const environmentNote =
    env === "indoor"
      ? `Most sampled shots flagged indoor (${mix.indoor}/${aggregate.global.shotsAnalyzed}). Carry, spin, and lateral derivatives are weighted as lower confidence — prioritize ball/club speed and smash-backed recommendations.`
      : env === "outdoor"
        ? `Outdoor-majority sampling (${mix.outdoor}/${aggregate.global.shotsAnalyzed}) — modeled carry/spin comparatively more trustworthy for coaching targets.`
        : `Mixed/unknown environments — defaulting conservative confidence on modeled flight metrics.`;

  const handicapNote =
    handicapIndex == null
      ? "No Handicap Index on file — using mid-pack amateur peer lines (≈10–15 handicap). Enter your handicap in Settings for tighter peer matching."
      : `Handicap ${handicapIndex} → peer bucket benchmarks applied for driving and mid-iron carry approximations.`;

  const benchmarks = [
    AMATEUR_DRIVE_YARDS.id,
    TRACKMAN_TOUR_2024.id,
    "knw:sg-priority-hierarchy",
  ].join(", ");
  const benchmarkVersionNote = `Benchmark tags: ${benchmarks}`;

  const candidates: SgRecommendation[] = [];

  const driver = getClub(aggregate, (n) => n.toLowerCase().includes("driver"));
  const iron7 = getClub(
    aggregate,
    (n) => /\b7\b/.test(normalizeClub(n)) && n.toLowerCase().includes("iron"),
  );

  const peerDrv = peerAverageDriveYards(handicapIndex);
  if (driver && driver.shotCount >= 4 && driver.carry?.mean != null) {
    const delta = peerDrv - driver.carry.mean;
    const tier = driver.metricConfidence.carryDistance;
    if (delta > 12) {
      const baseSg = Math.min(2.8, delta * 0.045);
      const est = Number((baseSg * tierMultiplier(tier)).toFixed(2));
      candidates.push({
        rank: 0,
        category: "offTheTee",
        title: "Driver carry vs handicap peer line",
        rationale: `KNOWLEDGE.md priority: Driving distance materially moves strokes for mid/high handicappers; closing even ${delta.toFixed(0)} yds improves approach proximity expectations.`,
        estimatedSgPerRound: est,
        confidenceLabel: toUiConfidence(
          [tier, driver.metricConfidence.ballSpeed],
          est,
        ),
        evidenceLines: [
          `Avg driver carry ${driver.carry.mean.toFixed(1)} yds vs ~${peerDrv} peer baseline for your handicap band.`,
          `Ball-speed confidence: ${driver.metricConfidence.ballSpeed}; carry tier: ${tier}.`,
          indoorHeavy
            ? "Indoor-heavy sample — corroborate carry gains outdoors when possible."
            : "",
        ].filter(Boolean),
        supportingMetrics: [
          {
            label: "Driver carry Δ vs peer",
            value: `${delta.toFixed(1)} yds short`,
          },
          { label: "Driver shots", value: `${driver.shotCount}` },
        ],
        drill: ottDrill(),
        tag: "mechanics",
      });
    }

    const launch = driver.launchAngle?.mean;
    const cs = driver.clubSpeed?.mean;
    const sr = driver.spinRate?.mean;
    const spinTier = driver.metricConfidence.spinRate;
    if (
      cs != null &&
      launch != null &&
      sr != null &&
      !indoorHeavy &&
      spinTier !== "trend_only"
    ) {
      const w = driverWindowForClubSpeedMph(cs);
      const loOff = launch < w.launchMin || launch > w.launchMax;
      const spOff = sr < w.spinMin || sr > w.spinMax;
      if (loOff || spOff) {
        const est = Number((0.45 * tierMultiplier(spinTier)).toFixed(2));
        candidates.push({
          rank: 0,
          category: "offTheTee",
          title: "Driver launch / spin inefficiency vs speed window",
          rationale:
            "Broadie-aligned distance efficiency: aligning launch/spin windows at your radar-measured swing speed lowers curve-related distance loss versus chasing face/path noise on small samples.",
          estimatedSgPerRound: est,
          confidenceLabel: toUiConfidence(["high", spinTier], est),
          evidenceLines: [
            `Club speed avg ${cs.toFixed(1)} mph → target launch window roughly ${w.launchMin}-${w.launchMax}°, spin ~${w.spinMin}-${w.spinMax} rpm (KNOWLEDGE.md / TrackMan-style driver tables).`,
            `Observed launch ${launch.toFixed(1)}°, spin ~${sr.toFixed(0)} rpm.`,
          ],
          supportingMetrics: [
            { label: "Launch angle", value: `${launch.toFixed(1)}°` },
            { label: "Spin rate", value: `${Math.round(sr)} rpm` },
          ],
          drill: {
            name: "Low-point + tee-height sweep",
            focus:
              "AoA / dynamic loft interplay without over-weighting modeled AoA indoors",
            steps: [
              "Tee two heights; five balls each — chase highest smash + stable launch direction.",
              "Track ball speed + carry trend only (ignore isolated spin outliers).",
              "Pick the tee height that minimizes spin variance across the block.",
            ],
          },
          tag: "mechanics",
        });
      }
    }
  }

  if (iron7 && iron7.shotCount >= 4 && iron7.carry?.mean != null) {
    const peer7 = peerApproxSevenIronCarry(handicapIndex);
    const tier = iron7.metricConfidence.carryDistance;
    const delta = peer7 - iron7.carry.mean;
    if (delta > 10) {
      const baseSg = Math.min(3.8, delta * 0.07);
      const est = Number((baseSg * tierMultiplier(tier)).toFixed(2));
      candidates.push({
        rank: 0,
        category: "approach",
        title: "7-iron carry vs handicap peer midpoint",
        rationale:
          "Broadie SG highlights approach as the dominant stroke pool for most golfers; deficient mid-iron carry compresses playable approach windows across many holes.",
        estimatedSgPerRound: est,
        confidenceLabel: toUiConfidence(
          [tier, iron7.metricConfidence.ballSpeed],
          est,
        ),
        evidenceLines: [
          `7i carry averaging ${iron7.carry.mean.toFixed(1)} vs ~${peer7} heuristic peer midpoint at your handicap.`,
          `Confidence on carry (${tier}); verify lofts uploaded in Settings (modern lofts shift windows).`,
        ],
        supportingMetrics: [
          { label: "7i carry Δ", value: `${delta.toFixed(1)} yds short` },
          { label: "7i shots", value: `${iron7.shotCount}` },
        ],
        drill: approachDrill("7 iron"),
        tag: "mechanics",
      });
    }

    const smashTier = iron7.metricConfidence.smashFactor;
    if ((iron7.smashFactor?.std ?? 0) > 0.05 && iron7.shotCount >= 6) {
      const est = Number((2.9 * tierMultiplier(smashTier)).toFixed(2));
      candidates.push({
        rank: 0,
        category: "approach",
        title: "Iron strike variability (smash factor noise)",
        rationale:
          "Smash dispersion is smash-backed on R10 (high confidence pathway) → strike inconsistency dominates iron distance dispersion before diagnosing loft/AoA from noisy spin/path.",
        estimatedSgPerRound: est,
        confidenceLabel: toUiConfidence(["high"], est),
        evidenceLines: [
          `Observed smash std ${(iron7.smashFactor?.std ?? 0).toFixed(
            3,
          )} across ${iron7.shotCount} stock 7-iron swings.`,
          `Compare to goal of tightening std (<0.04) once carry pattern stabilizes.`,
        ],
        supportingMetrics: [
          {
            label: "Smash std (7i)",
            value: `${(iron7.smashFactor?.std ?? 0).toFixed(3)}`,
          },
        ],
        drill: {
          name: "Foot spray impact audit",
          focus:
            "Strike pattern clarity before tweaking path/face (R10 caveat)",
          steps: [
            "Mist foot spray / impact stickers; twenty 7i swings.",
            "Log cluster bias (tow/heel/low/high) beside smash factor trend.",
            "Only after centered cluster progress, revisit dynamic loft tweaks.",
          ],
        },
        tag: "mechanics",
      });
    }
  }

  if (driver && driver.shotCount >= 8 && driver.dispersion.ellipse.width > 35) {
    const devTier = driver.metricConfidence.totalDeviation;
    const est = Number((1 * tierMultiplier(devTier)).toFixed(2));
    if (est >= 0.25) {
      candidates.push({
        rank: 0,
        category: "offTheTee",
        title: "Wide driver dispersion (start line / curvature proxy)",
        rationale:
          "Strategy + face-control work reduces double-cross damage; prioritized after distance efficiency only if offline pattern is materially wide (KNOWLEDGE dispersion context).",
        estimatedSgPerRound: est,
        confidenceLabel: toUiConfidence([devTier], est),
        evidenceLines: [
          `Driver lateral ellipse ~${driver.dispersion.ellipse.width.toFixed(1)} yds (${driver.shotCount} swings).`,
          `Total deviation modeled tier: ${devTier} (${driver.shotCount < LATERAL_DIAGNOSTIC_MIN_SHOTS ? "collect more swings before blaming path/face" : "inspect trend bundles"}).`,
        ],
        supportingMetrics: [
          {
            label: "Ellipse width × length",
            value: `${driver.dispersion.ellipse.width.toFixed(1)} × ${driver.dispersion.ellipse.length.toFixed(1)} yds`,
          },
        ],
        drill: {
          name: "Alignment stick start-line gate",
          focus:
            "Neutral face + start direction without micromanaging spin indoors",
          steps: [
            "Place sticks for start line ±5 yards.",
            "Hit 10 drivers tracking ball-speed + launch-direction only.",
            "Score how many clears the gate vs prior session.",
          ],
        },
        tag: "strategy",
      });
    }
  }

  /** SG category uplift for ranking (Broadie heuristic: approach first). */
  const categoryPri: Record<SgCategory, number> = {
    approach: 1.35,
    offTheTee: 1.1,
    aroundGreen: 0.95,
    putting: 0.65,
  };

  candidates.sort(
    (a, b) =>
      b.estimatedSgPerRound * categoryPri[b.category] -
      a.estimatedSgPerRound * categoryPri[a.category],
  );

  if (candidates.length === 0) {
    candidates.push({
      rank: 1,
      category: "approach",
      title: "No major SG leak detected vs coarse peer baselines",
      rationale:
        "Across driver + 7-iron heuristics, gaps were small versus handicap peer midpoints — keep auditing with more swings and handicap-accurate lofts logged.",
      estimatedSgPerRound: 0.35,
      confidenceLabel: "low",
      evidenceLines: [
        "Insufficient separation vs peer placeholders or sparse club coverage.",
        "Export additional sessions tagging indoor/outdoor for tighter confidence tiers.",
      ],
      supportingMetrics: [],
      drill: approachDrill("Practice plan"),
      tag: "mechanics",
    });
  }

  const ranked = candidates.map((rec, idx) => ({ ...rec, rank: idx + 1 }));

  return {
    benchmarkVersionNote,
    environmentNote,
    handicapNote,
    recommendations: ranked,
  };
}

const categoryPriRank: Record<SgCategory, number> = {
  approach: 1.35,
  offTheTee: 1.1,
  aroundGreen: 0.95,
  putting: 0.65,
};

/**
 * Sample-size gates on driver-linked drills, promote strategy tags, stable sort.
 */
export function finalizeSgFirstPlan(
  plan: SgFirstPlan,
  aggregate: ShotAggregate,
): SgFirstPlan {
  const driver = getClub(aggregate, (n) => n.toLowerCase().includes("driver"));

  const gated = plan.recommendations.map((rec) => {
    const driverScoped =
      rec.category === "offTheTee" &&
      (rec.title.toLowerCase().includes("driver") ||
        rec.evidenceLines.some((l) => l.toLowerCase().includes("driver")));
    if (!driverScoped || !driver) return rec;
    const n = driver.shotCount;
    const tier = sampleTierForCount(n);
    if (tier === "report_only") {
      return {
        ...rec,
        drill: {
          name: rec.drill.name,
          focus: `Report-only tier (n=${n}): ${rec.drill.focus}`,
          steps: [],
        },
      };
    }
    if (tier === "directional") {
      return {
        ...rec,
        drill: {
          ...rec.drill,
          focus: `Hypothesis to test (n=${n}): ${rec.drill.focus}`,
        },
      };
    }
    return rec;
  });

  const sorted = [...gated].sort((a, b) => {
    const pri = (x: SgRecommendation) => (x.tag === "strategy" ? 0 : 1);
    const d = pri(a) - pri(b);
    if (d !== 0) return d;
    return (
      b.estimatedSgPerRound * categoryPriRank[b.category] -
      a.estimatedSgPerRound * categoryPriRank[a.category]
    );
  });

  return {
    ...plan,
    recommendations: sorted.map((r, i) => ({ ...r, rank: i + 1 })),
  };
}
