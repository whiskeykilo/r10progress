/** Stored under settings JSON as `playerProfile`. */
export type HandicapSource = "manual";

export type PlayerProfileSettings = {
  /** Current Handicap Index used for peer benchmarks; null = unknown. */
  handicapIndex: number | null;
  handicapSource: HandicapSource | null;
  handicapLastSyncedAt: string | null;
  /** Actual static loft per club label (e.g. "7 Iron" -> 30.5). */
  clubLoftsByName: Record<string, number>;
};

export const defaultPlayerProfile = (): PlayerProfileSettings => ({
  handicapIndex: null,
  handicapSource: null,
  handicapLastSyncedAt: null,
  clubLoftsByName: {},
});
