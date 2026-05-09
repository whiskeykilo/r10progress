import { useContext } from "react";
import { SessionContext } from "../provider/SessionContext";
import { SettingsContext } from "../provider/SettingsContext";
import { Sessions } from "../types/Sessions";
import { applySettingsToShots } from "../utils/calculateAverages";

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

  // Key by session id (API filename), not date — multiple sessions can share a date.
  return Object.entries(sessions).reduce((acc, [sessionKey, session]) => {
    acc[sessionKey] = {
      ...session,
      results: applySettingsToShots(session.results, settings),
    };
    return acc;
  }, {} as Sessions);
};
