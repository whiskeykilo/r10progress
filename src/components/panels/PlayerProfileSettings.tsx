import { useContext, useMemo, useState } from "react";
import { SessionContext } from "../../provider/SessionContext";
import { useSettings } from "../../provider/SettingsContext";
import type { PlayerProfileSettings as PlayerProfile } from "../../types/playerProfile";
import { defaultPlayerProfile } from "../../types/playerProfile";
import { getClubName } from "../../utils/golfSwingData.helpers";
import { sortClubNames } from "../../utils/clubChartOrder";

const mergeProfile = (patch: Partial<PlayerProfile>): PlayerProfile => ({
  ...defaultPlayerProfile(),
  ...patch,
  clubLoftsByName: {
    ...defaultPlayerProfile().clubLoftsByName,
    ...patch.clubLoftsByName,
  },
});

const clubRangeOptions = (suffix: string): string[] =>
  Array.from({ length: 9 }, (_, i) => `${i + 1} ${suffix}`);

const BASE_CLUB_OPTIONS = [
  ...clubRangeOptions("Iron"),
  ...clubRangeOptions("Hybrid"),
  ...clubRangeOptions("Wood"),
];

export const PlayerProfileSettings = () => {
  const { settings, setSettings } = useSettings();
  const { sessions } = useContext(SessionContext);
  const [handicapStatus, setHandicapStatus] = useState<
    "saved" | "invalid" | null
  >(null);
  const profile = useMemo(() => {
    const p = settings.playerProfile ?? defaultPlayerProfile();
    return mergeProfile(p);
  }, [settings.playerProfile]);

  const csvClubLabels = useMemo(() => {
    const names = new Set<string>();
    BASE_CLUB_OPTIONS.forEach((club) => names.add(club));
    Object.values(sessions).forEach((session) => {
      session.results.forEach((shot) => {
        const club = getClubName(shot)?.trim();
        if (club) names.add(club);
      });
    });
    return sortClubNames(Array.from(names));
  }, [sessions]);

  const [loftClubSelect, setLoftClubSelect] = useState("");
  const [loftDeg, setLoftDeg] = useState("");

  const updateProfile = (next: Partial<PlayerProfile>) => {
    setSettings((prev) => ({
      ...prev,
      playerProfile: mergeProfile({
        ...(prev.playerProfile ?? defaultPlayerProfile()),
        ...next,
      }),
    }));
  };

  const setHandicapManual = (idx: number | null) => {
    if (idx === null) {
      updateProfile({
        handicapIndex: null,
        handicapSource: null,
        handicapLastSyncedAt: null,
      });
      return;
    }
    updateProfile({
      handicapIndex: idx,
      handicapSource: "manual",
      handicapLastSyncedAt: new Date().toISOString(),
    });
  };

  const loftRows = Object.entries(profile.clubLoftsByName).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  const addLoftRow = () => {
    const name = loftClubSelect.trim();
    const deg = Number(loftDeg);
    if (!name || !Number.isFinite(deg) || deg <= 0 || deg > 90) return;
    updateProfile({
      clubLoftsByName: {
        ...profile.clubLoftsByName,
        [name]: deg,
      },
    });
    setLoftClubSelect("");
    setLoftDeg("");
  };

  const removeLoftRow = (name: string) => {
    const { [name]: _, ...rest } = profile.clubLoftsByName;
    updateProfile({ clubLoftsByName: rest });
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          Handicap Index
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Enter your current index manually. It is used to pick amateur peer
          benchmarks for Strokes-Gained prioritization.
        </p>
        <div className="mt-2 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-600 dark:text-gray-300">
              Index
            </span>
            <input
              type="number"
              step="0.1"
              min={0}
              max={54}
              value={profile.handicapIndex ?? ""}
              onChange={(event) => {
                const raw = event.target.value;
                if (raw === "") {
                  setHandicapManual(null);
                  setHandicapStatus(null);
                  return;
                }

                const value = Number(raw);
                if (!Number.isFinite(value) || value < 0 || value > 54) {
                  setHandicapStatus("invalid");
                  return;
                }

                setHandicapManual(value);
                setHandicapStatus("saved");
              }}
              placeholder="e.g. 12.4"
              className="app-focus-ring field-on-darker-panel w-32"
            />
          </label>
          {handicapStatus === "saved" && (
            <span className="text-xs text-emerald-700 dark:text-emerald-300">
              Handicap saved.
            </span>
          )}
          {handicapStatus === "invalid" && (
            <span className="text-xs text-red-600 dark:text-red-400">
              Enter a valid handicap between 0 and 54.
            </span>
          )}
        </div>
      </div>

      <div className="border-t border-gray-200 pt-4 dark:border-gray-600">
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          Actual lofts (deg)
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Modern iron lofts vary; map each club label from your CSV to real loft
          for fair benchmark checks.
        </p>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <label className="flex min-w-40 flex-1 flex-col gap-1">
            <span className="sr-only">Club label (match your CSV)</span>
            <select
              aria-label="Club label (match your CSV)"
              value={loftClubSelect}
              onChange={(e) => setLoftClubSelect(e.target.value)}
              className="app-focus-ring field-on-darker-panel w-full"
            >
              <option value="">Select club label…</option>
              {csvClubLabels.map((club) => (
                <option key={club} value={club}>
                  {club}
                </option>
              ))}
            </select>
          </label>
          <input
            type="number"
            step="0.5"
            min={10}
            max={90}
            placeholder="°"
            value={loftDeg}
            onChange={(e) => setLoftDeg(e.target.value)}
            className="app-focus-ring field-on-darker-panel w-24"
          />
          <button
            type="button"
            onClick={addLoftRow}
            className="rounded-md bg-gray-700 px-3 py-2 text-sm text-white hover:bg-gray-600 dark:bg-gray-600"
          >
            Add
          </button>
        </div>
        {loftRows.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm text-gray-700 dark:text-gray-200">
            {loftRows.map(([name, deg]) => (
              <li
                key={name}
                className="flex items-center justify-between gap-2"
              >
                <span>
                  {name}: <strong>{deg}°</strong>
                </span>
                <button
                  type="button"
                  onClick={() => removeLoftRow(name)}
                  className="text-xs text-red-600 underline dark:text-red-400"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
