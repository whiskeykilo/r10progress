import { abbreviateClubName } from "./clubAbbreviations";

/**
 * ECharts palette for dispersion / all-shots views (stable order by bag sort).
 */
export const DISPERSION_CHART_PALETTE = [
  "#FF0000",
  "#FFA500",
  "#FFFF00",
  "#008000",
  "#0000FF",
  "#4B0082",
  "#EE82EE",
  "#A9A9A9",
  "#000000",
  "#FF4500",
  "#FFD700",
  "#ADFF2F",
  "#00FFFF",
  "#000080",
] as const;

export function chartColorForClubIndex(index: number): string {
  return DISPERSION_CHART_PALETTE[
    index % DISPERSION_CHART_PALETTE.length
  ] as string;
}

/** Bag order: wedges LW→AW, irons high#→low#, hybrids, woods, driver, putter, then unknown. */
function tierAndSort(club: string): [number, number] {
  const abbr = abbreviateClubName(club).normalize("NFKC");
  const wedges = ["LW", "SW", "GW", "PW", "AW"];
  const wi = wedges.indexOf(abbr);
  if (wi !== -1) return [0, wi];

  let m = /^(\d+)i$/i.exec(abbr);
  if (m) return [1, -parseInt(m[1], 10)];

  m = /^(\d+)h$/i.exec(abbr);
  if (m) return [2, -parseInt(m[1], 10)];

  m = /^(\d+)w$/i.exec(abbr);
  if (m) return [3, -parseInt(m[1], 10)];

  if (abbr === "D") return [4, 0];
  if (abbr === "Pt") return [5, 0];

  return [6, 0];
}

export function compareClubNamesForCharts(a: string, b: string): number {
  const [ta, sa] = tierAndSort(a);
  const [tb, sb] = tierAndSort(b);
  if (ta !== tb) return ta - tb;
  if (sa !== sb) return sa - sb;
  return a.localeCompare(b);
}

export function sortClubNames(names: string[]): string[] {
  return [...names].sort(compareClubNamesForCharts);
}
