import { useSelectedSessions } from "./useSelectedSessions";

export const useIsEnglishDataset = () => {
  const sessions = useSelectedSessions();
  const selectedSessions = Object.values(sessions);
  const firstResultWithData = selectedSessions.find(
    (session) => session.results.length > 0,
  )?.results[0];

  // Default locale is English (US) when dataset language is unknown.
  if (!firstResultWithData) return true;

  return !!firstResultWithData["Ball Speed"];
};
