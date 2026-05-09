import { Session, Sessions } from "../types/Sessions";
import { filterResultsWithMissingCells } from "./filterResultsWithMissingCells";

/** Same row filtering applied in SessionContext before display. */
export function visibleShotCountForSession(session: Session): number {
  const keyed: Record<string, Session> = { __s: session };
  return filterResultsWithMissingCells(keyed).__s.results.length;
}

/**
 * After upload, the snapshot must include the file and at least one visible shot.
 */
export function assertUploadVisibleInSnapshot(
  filename: string,
  snapshot: Sessions | undefined,
): asserts snapshot is Sessions {
  if (!snapshot) {
    throw new Error(
      "Could not load sessions from the API after upload. Stop duplicate dev servers (only one process should listen on port 8080), then run `pnpm dev` and use the URL it prints.",
    );
  }
  const session = snapshot[filename];
  if (!session) {
    throw new Error(
      `Upload did not appear in the session list as "${filename}". Reload the page. If this persists, ensure the Vite dev server proxies /api to your API (default port 8080) and no stale server is bound to that port.`,
    );
  }
  const n = visibleShotCountForSession(session);
  if (n < 1) {
    throw new Error(
      "The file was saved but no shot rows are visible after processing. Check that this is a valid Garmin R10 CSV export with data rows.",
    );
  }
}
