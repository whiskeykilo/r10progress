/** Stored under settings JSON as `playerProfile`. */
export type HandicapSource = "manual" | "ghin";

export type PlayerProfileSettings = {
  /** GHIN number as entered by the user (no public API in self-hosted build). */
  ghinNumber: string;
  /** User-confirmed display name when linking (e.g. "Last, First"). */
  golferDisplayName: string;
  /** Whether the user explicitly confirmed the GHIN + name pair. */
  ghinLinkConfirmed: boolean;
  /** Current Handicap Index used for peer benchmarks; null = unknown. */
  handicapIndex: number | null;
  handicapSource: HandicapSource | null;
  handicapLastSyncedAt: string | null;
  /** Actual static loft per club label (e.g. "7 Iron" -> 30.5). */
  clubLoftsByName: Record<string, number>;
};

export const defaultPlayerProfile = (): PlayerProfileSettings => ({
  ghinNumber: "",
  golferDisplayName: "",
  ghinLinkConfirmed: false,
  handicapIndex: null,
  handicapSource: null,
  handicapLastSyncedAt: null,
  clubLoftsByName: {},
});
