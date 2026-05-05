import {
  FC,
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import { apiDelete, apiGet, apiPatch, apiPost } from "../api";
import { GolfSwingData } from "../types/GolfSwingData";
import { Session, Sessions } from "../types/Sessions";
import { translateSessionsToEnglish } from "../utils/csvLocalization";
import { getDateFromResults } from "../utils/date.utils";
import { filterResultsWithMissingCells } from "../utils/filterResultsWithMissingCells";
import { getDate } from "../utils/golfSwingData.helpers";
import { reduceSessionToDefinedValues } from "../utils/utils";
import { UserContext } from "./UserContext";

export interface SessionContextInterface {
  initialized: boolean;
  isLoading: boolean;
  sessions: Sessions;
  setSessions: (sessions: Sessions) => void;
  fetchSnapshot: () => Promise<Sessions | undefined>;
  deleteSession: (id: string) => Promise<void>;
  exportSessionsToJson: (sessions: Sessions) => void;
  deleteRowFromSession: (
    sessionId: string,
    row: GolfSwingData,
  ) => Promise<void>;
}

const SessionContext = createContext<SessionContextInterface>({
  initialized: false,
  isLoading: false,
  sessions: {},
  setSessions: () => {},
  fetchSnapshot: () => Promise.resolve(undefined),
  deleteSession: () => Promise.resolve(),
  deleteRowFromSession: () => Promise.resolve(),
  exportSessionsToJson: () => {},
});

const SessionProvider: FC<PropsWithChildren> = ({ children }) => {
  const [sessions, setSessions] = useState<Sessions>({});
  const setSessionsCallback = useCallback((sessions: Sessions) => {
    setSessions(filterResultsWithMissingCells(sessions));
  }, []);
  const [initialized, setInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { user } = useContext(UserContext);

  const fetchSessions = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const raw =
        await apiGet<
          Record<string, { results: unknown[]; created_at: number }>
        >("/api/sessions");
      const sessionResult: Sessions = {};
      for (const [filename, data] of Object.entries(raw)) {
        const session = reduceSessionToDefinedValues({
          results: data.results,
        } as Session);
        sessionResult[filename] = {
          ...session,
          selected: true,
          date: getDateFromResults(session.results),
        };
      }
      setSessionsCallback(sessionResult);
      setInitialized(true);
      setIsLoading(false);
      return sessionResult;
    } catch (error) {
      console.error(error);
    }
    setIsLoading(false);
  }, [user, setSessionsCallback]);

  const exportSessionsToJson = useCallback((sessions: Sessions) => {
    const element = document.createElement("a");
    const file = new Blob([JSON.stringify(sessions)], {
      type: "application/json",
    });
    element.href = URL.createObjectURL(file);
    element.download = "sessions.json";
    document.body.appendChild(element);
    element.click();
  }, []);

  const deleteSession = useCallback(
    async (id: string) => {
      await apiDelete(`/api/sessions/${encodeURIComponent(id)}`);
      setSessions((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    },
    [setSessions],
  );

  const deleteRowFromSession = useCallback(
    async (sessionId: string, row: GolfSwingData) => {
      const session = sessions[sessionId];
      if (!session) return;
      const rowIndex = session.results.findIndex(
        (r) => getDate(r) === getDate(row),
      );
      if (rowIndex === -1) return;
      const updatedResults = [...session.results];
      updatedResults.splice(rowIndex, 1);
      await apiPatch(`/api/sessions/${encodeURIComponent(sessionId)}`, {
        results: updatedResults,
      });
      setSessions((prev) => ({
        ...prev,
        [sessionId]: { ...prev[sessionId], results: updatedResults },
      }));
    },
    [sessions, setSessions],
  );

  const memoizedValue = useMemo(
    () => ({
      initialized,
      isLoading,
      sessions: translateSessionsToEnglish(sessions),
      setSessions: setSessionsCallback,
      fetchSnapshot: fetchSessions,
      deleteSession,
      exportSessionsToJson,
      deleteRowFromSession,
    }),
    [
      initialized,
      isLoading,
      sessions,
      setSessionsCallback,
      fetchSessions,
      deleteSession,
      exportSessionsToJson,
      deleteRowFromSession,
    ],
  );

  return (
    <SessionContext.Provider value={memoizedValue}>
      {children}
    </SessionContext.Provider>
  );
};

// Re-export apiPost so Upload.tsx can call POST /api/sessions/:filename
export { apiPost };
export { SessionContext, SessionProvider };
