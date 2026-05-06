import { useContext } from "react";
import { SessionContext } from "../provider/SessionContext";
import { SettingsContext } from "../provider/SettingsContext";
import { Sessions } from "../types/Sessions";
import {
  dropOutliers,
  filterShotsByQuality,
  getAboveAverageShots,
} from "../utils/calculateAverages";
import { applyRangeBallCompensationToShots } from "../utils/rangeBallCompensation";

export const useSelectedSessions = () => {
  const { sessions } = useContext(SessionContext);

  return Object.entries(sessions).reduce((acc, [key, value]) => {
    if (value.selected) {
      acc[key] = value;
    }
    return acc;
  }, {} as Sessions);
};

export const useSelectedSessionsWithSettings = () => {
  const sessions: Sessions = useSelectedSessions();
  const { settings } = useContext(SettingsContext);

  return Object.values(sessions).reduce((acc, session) => {
    let results = applyRangeBallCompensationToShots(session.results, settings);
    if (settings.useIQR) {
      results = dropOutliers(results);
    }
    if (settings.useAboveAverageShots) {
      results = getAboveAverageShots(results);
    }
    if (settings.useShotQualityFilter) {
      results = filterShotsByQuality(results);
    }

    acc[session.date] = { ...session, results };
    return acc; // Add this line to return the accumulator
  }, {} as Sessions);
};
