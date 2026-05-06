import { useContext, useMemo } from "react";
import { SessionContext } from "../provider/SessionContext";
import { SettingsContext } from "../provider/SettingsContext";
import { GolfSwingData } from "../types/GolfSwingData";
import type { Session, Sessions } from "../types/Sessions";
import { translateSwingsToEnglish } from "./csvLocalization";
import {
  getCarryDistance,
  getClubName,
  getTotalDeviationDistance,
  getTotalDistance,
} from "./golfSwingData.helpers";

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
        settings.useIQR,
        settings.useAboveAverageShots,
      );
    }
    return [];
  }, [sessions, settings.useIQR, settings.useAboveAverageShots]);
};

export type AveragedSwingRecord = {
  date: string;
  displayName?: string;
  averages: AveragedSwing[];
};
export const useAveragePerSession = () => {
  const { sessions } = useContext(SessionContext);

  return useMemo(() => {
    if (sessions) {
      return Object.values(sessions).reduce((previousValue, currentValue) => {
        const date = currentValue.date;
        const displayName = currentValue.displayName;
        const averages = calculateAverages({ "1": currentValue });
        return [...previousValue, { date, displayName, averages }];
      }, [] as AveragedSwingRecord[]);
    }
    return [];
  }, [sessions]);
};

// Calculate averages for each club across all sessions
export const calculateAverages: (
  input: Sessions,
  calculateWithIqr?: boolean,
  useAboveAverageShots?: boolean,
) => AveragedSwing[] = (
  input,
  calculateWithIqr = false,
  useAboveAverageShots = false,
) => {
  if (input) {
    const sessions = Object.keys(input).map((key) => ({
      ...input[key],
      results: translateSwingsToEnglish(input[key].results),
    }));
    const filteredSessions = sessions
      .filter((session) => session.selected && session.results?.length > 0)
      .map((session) => {
        let results = session.results;
        if (calculateWithIqr) {
          results = dropOutliers(results);
        }
        if (useAboveAverageShots) {
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
 * Calculate the 10 best shots for all clubs for the selected sessions,
 * average them and return the result.
 */
export const useBestShots = () => {
  const { sessions } = useContext(SessionContext);

  return useMemo(() => {
    if (sessions) {
      // Get all shots from selected sessions
      const allShots = Object.values(sessions)
        .filter((session) => session.selected)
        .map((session) => session.results)
        .flat();

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
      return {
        bestShots,
        averages: calculateAverages({ "1": dummySession }),
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
  }, [sessions]);
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
