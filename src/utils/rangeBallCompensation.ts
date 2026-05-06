import type { SettingsType } from "../provider/SettingsContext";
import { GolfSwingData } from "../types/GolfSwingData";
import { translateSwingsToEnglish } from "./csvLocalization";
import { getClubName } from "./golfSwingData.helpers";

type CompensationCategory =
  | "wedges"
  | "shortIrons"
  | "midLongIrons"
  | "hybridsWoodsDriver";

const DISTANCE_KEYS: Array<keyof GolfSwingData> = [
  "Carry Distance",
  "Carry-Distanz",
  "Dist.​vuelo",
  "Carry-afstand",
  "Total Distance",
  "Gesamtstrecke",
  "Distan​cia total",
  "Totale afstand",
];

const WEDGE_NAMES = new Set([
  "Lob Wedge",
  "Sand Wedge",
  "Gap Wedge",
  "Pitching Wedge",
]);

export const getRangeBallCompensationCategory = (
  clubName: string | null | undefined,
): CompensationCategory | null => {
  if (!clubName) return null;
  const normalized = clubName.trim();
  if (WEDGE_NAMES.has(normalized)) return "wedges";
  if (/^[89]\s*Iron$/i.test(normalized)) return "shortIrons";
  if (/^[3-7]\s*Iron$/i.test(normalized)) return "midLongIrons";
  if (
    /Hybrid/i.test(normalized) ||
    /Wood/i.test(normalized) ||
    /Driver/i.test(normalized)
  ) {
    return "hybridsWoodsDriver";
  }
  return null;
};

const getMultiplierForShot = (
  shot: GolfSwingData,
  settings: SettingsType,
): number => {
  if (!settings.applyRangeBallCompensation) return 1;
  const translatedShot = translateSwingsToEnglish([shot])[0];
  const category = getRangeBallCompensationCategory(
    getClubName(translatedShot),
  );
  if (!category) return 1;
  return settings.rangeBallCompensation[category];
};

export const applyRangeBallCompensationToShot = (
  shot: GolfSwingData,
  settings: SettingsType,
): GolfSwingData => {
  const multiplier = getMultiplierForShot(shot, settings);
  if (multiplier === 1) return shot;

  const adjusted = { ...shot };
  DISTANCE_KEYS.forEach((key) => {
    const value = adjusted[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      (adjusted as Record<string, unknown>)[key] = value * multiplier;
    }
  });
  return adjusted;
};

export const applyRangeBallCompensationToShots = (
  shots: GolfSwingData[],
  settings: SettingsType,
) => {
  if (!settings.applyRangeBallCompensation) return shots;
  return shots.map((shot) => applyRangeBallCompensationToShot(shot, settings));
};
