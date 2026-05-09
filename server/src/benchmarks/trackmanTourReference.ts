import type { BenchmarkVersion } from "./types";

/**
 * 2024 TrackMan tour reference numbers (PGA / LPGA) — selected clubs.
 * Full tables: TrackMan blog + support PDFs; condensed carry/speed lines for benchmarking.
 */
export const TRACKMAN_TOUR_2024: BenchmarkVersion = {
  id: "trackman-tour-2024",
  label: "TrackMan 2024 Tour averages (selected clubs)",
  citations: [
    "https://www.trackman.com/blog/golf/introducing-updated-tour-averages",
    "https://support.trackmangolf.com/hc/en-us/articles/5089752464667-Shot-Analysis-Tour-Averages-On-PGA-LPGA-Tour",
  ],
};

export type TourClubRow = {
  clubLabel: string;
  pga?: { carryYds?: number; clubSpeedMph?: number; ballSpeedMph?: number };
  lpga?: { carryYds?: number; clubSpeedMph?: number; ballSpeedMph?: number };
};

/** Subset used for quick gap checks; extend as needed. */
export const TOUR_CLUB_REFERENCE: TourClubRow[] = [
  {
    clubLabel: "Driver",
    pga: { carryYds: 275, clubSpeedMph: 113, ballSpeedMph: 167 },
    lpga: { carryYds: 218, clubSpeedMph: 94, ballSpeedMph: 140 },
  },
  {
    clubLabel: "7 Iron",
    pga: { carryYds: 172, clubSpeedMph: 90, ballSpeedMph: 120 },
    lpga: { carryYds: 139 },
  },
  {
    clubLabel: "Pitching Wedge",
    pga: { carryYds: 128 },
    lpga: { carryYds: 101 },
  },
];
