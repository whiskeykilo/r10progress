import { useContext, useMemo } from "react";
import { SessionContext } from "../provider/SessionContext";
import { SettingsContext } from "../provider/SettingsContext";
import type { SettingsType } from "../provider/SettingsContext";
import { defaultPlayerProfile } from "../types/playerProfile";
import { GolfSwingData } from "../types/GolfSwingData";
import type { Session, Sessions } from "../types/Sessions";
import { translateSwingsToEnglish } from "./csvLocalization";
import {
  getCarryDistance,
  getClubName,
  getSmashFactor,
  getTotalDeviationDistance,
  getTotalDistance,
} from "./golfSwingData.helpers";
import { applyRangeBallCompensationToShots } from "./rangeBallCompensation";
import { parseDate } from "./utils";

const quantile = (arr: number[], q: number) => {
  const sorted = arr.sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  } else {
    return sorted[base];
  }
};

export type AveragedSwing = GolfSwingData & {
  count: number;
  name: string;
};

export const useAveragedSwings = () => {
  const { sessions } = useContext(SessionContext);

  const { settings } = useContext(SettingsContext);

  return useMemo(() => {
    if (sessions) {
      return calculateAverages(
        sessions,
        settings,
        settings.useIQR,
        settings.useAboveAverageShots,
      );
    }
    return [];
  }, [sessions, settings]);
};

export type AveragedSwingRecord = {
  date: string;
  displayName?: string;
  averages: AveragedSwing[];
};
export const useAveragePerSession = () => {
  const { sessions } = useContext(SessionContext);
  const { settings } = useContext(SettingsContext);

  return useMemo(() => {
    if (!sessions) return [];

    const selected = Object.values(sessions).filter(
      (s) => s.selected && (s.results?.length ?? 0) > 0,
    );
    const sorted = [...selected].sort((a, b) =>
      parseDate(a.date).localeCompare(parseDate(b.date)),
    );

    return sorted.map((currentValue) => ({
      date: currentValue.date,
      displayName: currentValue.displayName,
      averages: calculateAverages({ "1": currentValue }, settings),
    }));
  }, [sessions, settings]);
};

// Calculate averages for each club across all sessions
export const calculateAverages: (
  input: Sessions,
  settings?: SettingsType,
  calculateWithIqr?: boolean,
  useAboveAverageShots?: boolean,
) => AveragedSwing[] = (
  input,
  settings,
  calculateWithIqr = false,
  useAboveAverageShots = false,
) => {
  if (input) {
    const sessions = Object.keys(input).map((key) => ({
      ...input[key],
      results: applyRangeBallCompensationToShots(
        translateSwingsToEnglish(input[key].results),
        settings ?? {
          useIQR: false,
          useAboveAverageShots: false,
          useShotQualityFilter: true,
          shotQualitySdMode: "asymmetric",
          unit: "yards",
          applyRangeBallCompensation: false,
          rangeBallCompensation: {
            wedges: 1.05,
            shortIrons: 1.06,
            midLongIrons: 1.07,
            hybridsWoodsDriver: 1.08,
          },
          playerProfile: defaultPlayerProfile(),
        },
      ),
    }));
    const filteredSessions = sessions
      .filter((session) => session.selected && session.results?.length > 0)
      .map((session) => {
        let results = session.results;
        const shouldUseShotQuality = Boolean(settings?.useShotQualityFilter);
        const shouldUseIqr = calculateWithIqr || Boolean(settings?.useIQR);
        if (shouldUseShotQuality) {
          results = filterShotsByQuality(results, settings?.shotQualitySdMode);
        } else if (shouldUseIqr) {
          results = dropOutliers(results);
        }
        if (useAboveAverageShots || Boolean(settings?.useAboveAverageShots)) {
          results = getAboveAverageShots(results);
        }
        return { ...session, results };
      });

    const metricValuesByClub: Record<string, Record<string, number[]>> = {};
    const clubCounts: Record<string, number> = {};

    for (const session of filteredSessions) {
      for (const swing of session.results) {
        const club = getClubName(swing);
        if (!club) continue;

        clubCounts[club] = (clubCounts[club] ?? 0) + 1;
        if (!metricValuesByClub[club]) {
          metricValuesByClub[club] = {};
        }

        for (const [key, value] of Object.entries(swing)) {
          if (
            key === "Schlägername" ||
            typeof value !== "number" ||
            isNaN(value)
          ) {
            continue;
          }
          if (!metricValuesByClub[club][key]) {
            metricValuesByClub[club][key] = [];
          }
          metricValuesByClub[club][key].push(value);
        }
      }
    }

    const clubs: AveragedSwing[] = Object.entries(metricValuesByClub).map(
      ([club, metrics]) => {
        const averaged: Record<string, number | string> = {
          name: club,
          count: clubCounts[club] ?? 0,
        };

        for (const [key, values] of Object.entries(metrics)) {
          if (values.length === 0) {
            averaged[key] = 0;
            continue;
          }
          averaged[key] =
            Math.round(
              (values.reduce((acc, curr) => acc + curr, 0) / values.length) *
                100,
            ) / 100;
        }

        return averaged as unknown as AveragedSwing;
      },
    );

    // Flatten to an array with the club name as key
    const sortedClubs = clubs.sort(sortClubs);

    return sortedClubs;
  }
  return [];
};

// Sort irons, woods, and hybrids by their number
// Put wedges first
// Driver comes last
const sortClubs = (a: AveragedSwing, b: AveragedSwing) => {
  const clubA = a.name;
  const clubB = b.name;

  // Sort wedges
  const wedgeOrder = [
    ...lobwedgeVariations,
    ...sandwedgeVariations,
    ...gapwedgeVariations,
    ...pitchingwedgeVariations,
  ];
  const wedgeA = wedgeOrder.indexOf(clubA);
  const wedgeB = wedgeOrder.indexOf(clubB);
  if (wedgeA !== -1 && wedgeB !== -1) {
    return wedgeA - wedgeB;
  }
  if (wedgeA !== -1) {
    return -1;
  }
  if (wedgeB !== -1) {
    return 1;
  }
  // Wedge could also just include "Wedge" or "wedge" in the name
  const clubAIsWedge = clubA.includes("Wedge") || clubA.includes("wedge");
  const clubBIsWedge = clubB.includes("Wedge") || clubB.includes("wedge");
  if (clubA.includes("Wedge") && !clubA.includes("Driver")) {
    return -1;
  }
  if (clubBIsWedge && !clubB.includes("Driver")) {
    return 1;
  }
  if (clubAIsWedge) {
    return -1;
  }
  if (clubB.includes("Wedge") || clubB.includes("wedge")) {
    return 1;
  }

  // Sort irons, woods, and hybrids by their number
  // but separate them by type
  const clubTypeOrder = ["Iron", "Hybrid", "Wood"];
  const typeA = clubTypeOrder.findIndex((type) => clubA.includes(type));
  const typeB = clubTypeOrder.findIndex((type) => clubB.includes(type));
  if (typeA !== -1 && typeB !== -1) {
    if (typeA === typeB) {
      const numberA = parseInt(clubA.match(/\d+/)?.[0] || "0");
      const numberB = parseInt(clubB.match(/\d+/)?.[0] || "0");
      return numberB - numberA;
    }
    return typeA - typeB;
  }
  if (typeA !== -1) {
    return -1;
  }
  if (typeB !== -1) {
    return 1;
  }
  return clubA.localeCompare(clubB);
};

const sandwedgeVariations = [
  "Sand Wedge",
  "Sandwedge",
  "Sand-Wedge",
  "Sand-wedge",
  "Sand wedge",
];

const pitchingwedgeVariations = [
  "Pitching Wedge",
  "Pitching-Wedge",
  "Pitchingwedge",
  "Pitching-wedge",
  "Pitching wedge",
];

const gapwedgeVariations = [
  "Gap Wedge",
  "Gapwedge",
  "Gap-Wedge",
  "Gap-wedge",
  "Gap wedge",
];

const lobwedgeVariations = [
  "Lob Wedge",
  "Lob-Wedge",
  "Lobwedge",
  "Lob wedge",
  "Lob-wedge",
];

/**
 * This function removes outliers based on `Gesamtstrecke` per club type.
 *
 * @param swings - The swings to filter
 */
export const dropOutliers = (swings: GolfSwingData[]) => {
  // Filter out outliers
  const filteredSwings = swings.filter((swing) => {
    const club = getClubName(swing);
    const distance = getTotalDistance(swing);
    if (!club || !distance) {
      return false;
    }
    const values = swings
      .filter((s) => {
        const sClub = getClubName(s);
        return sClub === club;
      })
      .map((s) => getTotalDistance(s));
    const q1 = quantile(values, 0.25);
    const q3 = quantile(values, 0.75);
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    return distance >= lowerBound && distance <= upperBound;
  });

  return filteredSwings;
};

export const getAboveAverageShots = (swings: GolfSwingData[]) => {
  // Filter out outliers
  const filteredSwings = swings.filter((swing) => {
    const club = getClubName(swing);
    const distance = getTotalDistance(swing);
    if (!club || !distance) {
      return false;
    }
    const values = swings
      .filter((s) => {
        const sClub = getClubName(s);
        return sClub === club;
      })
      .map((s) => getTotalDistance(s));
    const average = values.reduce((acc, curr) => acc + curr, 0) / values.length;
    return distance >= average;
  });

  return filteredSwings;
};

/**
 * Range ball, outlier filtering, and “best shots” view — same rules as session-scoped graphs.
 */
export const applySettingsToShots = (
  results: GolfSwingData[],
  settings: SettingsType,
): GolfSwingData[] => {
  let r = applyRangeBallCompensationToShots(results, settings);
  if (settings.useShotQualityFilter) {
    r = filterShotsByQuality(r, settings.shotQualitySdMode);
  } else if (settings.useIQR) {
    r = dropOutliers(r);
  }
  if (settings.useAboveAverageShots) {
    r = getAboveAverageShots(r);
  }
  return r;
};

const MIN_IRON_SMASH = 1.2;
const MIN_GROUP_SIZE = 4;
const DEFAULT_LOW_SIDE_SD = 2;
const DEFAULT_HIGH_SIDE_SD = 2;
const ASYMMETRIC_HIGH_SIDE_SD = 3;
export type ShotQualitySdMode = "symmetric" | "asymmetric";

const WEDGE_KEYWORDS = [
  "wedge",
  "sandwedge",
  "pitching",
  "gap",
  "lob",
  "wedges",
  "keil",
  "cuña",
];

const TRUE_IRON_PATTERNS = [
  /\b[3-9]\s*iron\b/i,
  /\biron\s*[3-9]\b/i,
  /\b[3-9]\s*eisen\b/i,
  /\beisen\s*[3-9]\b/i,
  /\b[3-9]\s*hierro\b/i,
  /\bhierro\s*[3-9]\b/i,
  /\b[3-9]\s*ijzer\b/i,
  /\bijzer\s*[3-9]\b/i,
];

const isWedgeClub = (clubName: string) =>
  WEDGE_KEYWORDS.some((keyword) => clubName.toLowerCase().includes(keyword));

export const isTrueIronClub = (clubName: string) =>
  !isWedgeClub(clubName) &&
  TRUE_IRON_PATTERNS.some((pattern) => pattern.test(clubName));

export const filterShotsByQuality = (
  swings: GolfSwingData[],
  sdMode: ShotQualitySdMode = "asymmetric",
) => {
  const carryByClub: Record<string, number[]> = {};

  swings.forEach((shot) => {
    const club = getClubName(shot);
    const carry = getCarryDistance(shot);
    if (!club || typeof carry !== "number" || !Number.isFinite(carry)) return;
    if (!carryByClub[club]) {
      carryByClub[club] = [];
    }
    carryByClub[club].push(carry);
  });

  const statsByClub = Object.fromEntries(
    Object.entries(carryByClub).map(([club, carries]) => {
      const mean =
        carries.reduce((sum, value) => sum + value, 0) / carries.length;
      const variance =
        carries.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
        carries.length;
      return [
        club,
        { mean, stdDev: Math.sqrt(variance), count: carries.length },
      ];
    }),
  );

  return swings.filter((shot) => {
    const club = getClubName(shot);
    if (!club) return false;

    const smash = getSmashFactor(shot);
    const isIron = isTrueIronClub(club);
    if (
      isIron &&
      typeof smash === "number" &&
      Number.isFinite(smash) &&
      smash < MIN_IRON_SMASH
    ) {
      return false;
    }

    const carry = getCarryDistance(shot);
    const stats = statsByClub[club];
    if (
      typeof carry !== "number" ||
      !Number.isFinite(carry) ||
      !stats ||
      stats.count < MIN_GROUP_SIZE ||
      stats.stdDev === 0
    ) {
      return true;
    }

    const lowerSideSd = DEFAULT_LOW_SIDE_SD;
    const upperSideSd =
      sdMode === "asymmetric" ? ASYMMETRIC_HIGH_SIDE_SD : DEFAULT_HIGH_SIDE_SD;
    const lowerBound = stats.mean - lowerSideSd * stats.stdDev;
    const upperBound = stats.mean + upperSideSd * stats.stdDev;

    return carry >= lowerBound && carry <= upperBound;
  });
};

/**
 * Calculate the 10 best shots for all clubs for the selected sessions,
 * average them and return the result.
 */
export const useBestShots = () => {
  const { sessions } = useContext(SessionContext);
  const { settings } = useContext(SettingsContext);

  return useMemo(() => {
    if (sessions) {
      const allShots = Object.values(sessions)
        .filter((session) => session.selected)
        .flatMap((session) => applySettingsToShots(session.results, settings));

      // Group shots by club
      const shotsByClub = allShots.reduce(
        (acc, shot) => {
          const club = getClubName(shot);
          if (!club) return acc;

          if (!acc[club]) acc[club] = [];
          acc[club].push(shot);
          return acc;
        },
        {} as Record<string, GolfSwingData[]>,
      );

      const bestShotData = Object.values(shotsByClub)
        .map((clubShots) => {
          const sortedShots = clubShots
            .sort((a, b) => {
              const distanceA = getCarryDistance(a);
              const distanceB = getCarryDistance(b);
              return distanceA > distanceB ? -1 : 1;
            })
            .slice(0, 10);

          // Add dispersion calculation
          const dispersionRadius = calculateDispersionRadius(sortedShots);
          return { sortedShots, dispersionRadius };
        })
        .flat();

      const bestShots = bestShotData.map((shot) => shot.sortedShots).flat();

      const dummySession: Session = {
        date: "",
        selected: true,
        results: bestShots,
      };
      const aggregateOnly: SettingsType = {
        ...settings,
        applyRangeBallCompensation: false,
        useShotQualityFilter: false,
        useIQR: false,
        useAboveAverageShots: false,
      };
      return {
        bestShots,
        averages: calculateAverages({ "1": dummySession }, aggregateOnly),
        dispersion: bestShotData.map((shot) => ({
          club: getClubName(shot.sortedShots[0]),
          ellipse: calculateDispersionEllipse(shot.sortedShots),
        })),
      };
    }
    return {
      bestShots: [],
      averages: [],
      dispersion: [
        {
          club: null,
          ellipse: { xAxis: 0, yAxis: 0 },
        },
      ],
    };
  }, [sessions, settings]);
};

const calculateDispersionRadius = (shots: GolfSwingData[]): number => {
  // Convert polar to cartesian coordinates
  const points = shots.map((shot) => {
    const distance = getTotalDistance(shot);
    const deviation = getTotalDeviationDistance(shot) || 0;
    const angle = Math.atan2(deviation, distance);

    return {
      x: distance * Math.cos(angle),
      y: distance * Math.sin(angle),
    };
  });

  if (points.length === 0) return 0;

  // Calculate center point
  const centerX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
  const centerY = points.reduce((sum, p) => sum + p.y, 0) / points.length;

  // Find maximum distance from center (radius)
  const radius = Math.max(
    ...points.map((point) => {
      const dx = point.x - centerX;
      const dy = point.y - centerY;
      return Math.sqrt(dx * dx + dy * dy);
    }),
  );

  return radius;
};

interface DispersionEllipse {
  xAxis: number;
  yAxis: number;
}

const calculateDispersionEllipse = (
  shots: GolfSwingData[],
): DispersionEllipse => {
  const points = shots.map((shot) => {
    const distance = getTotalDistance(shot);
    const deviation = getTotalDeviationDistance(shot) || 0;
    const angle = Math.atan2(deviation, distance);

    return {
      x: distance * Math.cos(angle),
      y: distance * Math.sin(angle),
    };
  });

  if (points.length === 0) return { xAxis: 0, yAxis: 0 };

  const centerX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
  const centerY = points.reduce((sum, p) => sum + p.y, 0) / points.length;

  // Calculate standard deviations with 95% confidence interval (1.96 * 2)
  const confidenceInterval = 1.96 * 2;

  const xDeviations = points.map((p) => Math.abs(p.x - centerX));
  const yDeviations = points.map((p) => Math.abs(p.y - centerY));

  // Use maximum deviations for more realistic dispersion
  const xAxis = Math.max(...xDeviations) * confidenceInterval;
  const yAxis = Math.max(...yDeviations) * confidenceInterval;

  return {
    xAxis,
    yAxis,
  };
};
