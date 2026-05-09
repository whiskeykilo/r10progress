import { useMemo, useState } from "react";
import clsx from "clsx";
import { apiPost } from "../../api";
import { COMMON_GOLF_CLUB_LABELS } from "../../constants/golfClubNames";
import { useSettings } from "../../provider/SettingsContext";
import type { PlayerProfileSettings as PlayerProfile } from "../../types/playerProfile";
import { defaultPlayerProfile } from "../../types/playerProfile";

const CUSTOM_CLUB_VALUE = "__custom__";

const mergeProfile = (patch: Partial<PlayerProfile>): PlayerProfile => ({
  ...defaultPlayerProfile(),
  ...patch,
  clubLoftsByName: {
    ...defaultPlayerProfile().clubLoftsByName,
    ...patch.clubLoftsByName,
  },
});

export const PlayerProfileSettings = () => {
  const { settings, setSettings } = useSettings();
  const profile = useMemo(() => {
    const p = settings.playerProfile ?? defaultPlayerProfile();
    return mergeProfile(p);
  }, [settings.playerProfile]);

  const [loftClubSelect, setLoftClubSelect] = useState("");
  const [loftClubCustom, setLoftClubCustom] = useState("");
  const [loftDeg, setLoftDeg] = useState("");
  const [ghinMsg, setGhinMsg] = useState<string | null>(null);
  const [ghinBusy, setGhinBusy] = useState(false);

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

  const tryGhinSync = async () => {
    const n = profile.ghinNumber.replace(/\s/g, "");
    if (n.length < 4) {
      setGhinMsg("Enter a valid GHIN number first.");
      return;
    }
    if (!profile.ghinLinkConfirmed) {
      setGhinMsg("Confirm the golfer identity below before syncing.");
      return;
    }
    setGhinBusy(true);
    setGhinMsg(null);
    try {
      await apiPost<{ message?: string; code?: string }>("/api/ghin/lookup", {
        ghinNumber: n,
      });
      setGhinMsg("Unexpected success — check server logs.");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("503")) {
        setGhinMsg(
          "GHIN API is not configured on this server. Use manual Handicap Index — values from GHIN remain your source of truth when you transcribe them.",
        );
      } else {
        setGhinMsg(msg);
      }
    } finally {
      setGhinBusy(false);
    }
  };

  const loftRows = Object.entries(profile.clubLoftsByName).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  const addLoftRow = () => {
    const name =
      loftClubSelect === CUSTOM_CLUB_VALUE
        ? loftClubCustom.trim()
        : loftClubSelect.trim();
    const deg = Number(loftDeg);
    if (!name || !Number.isFinite(deg) || deg <= 0 || deg > 90) return;
    updateProfile({
      clubLoftsByName: {
        ...profile.clubLoftsByName,
        [name]: deg,
      },
    });
    setLoftClubSelect("");
    setLoftClubCustom("");
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
          Used to pick amateur peer benchmarks for Strokes-Gained
          prioritization.
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
                setHandicapManual(raw === "" ? null : Number(raw));
              }}
              placeholder="e.g. 12.4"
              className="app-focus-ring w-32 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
          </label>
          {(profile.handicapSource || profile.handicapIndex != null) && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Source: {profile.handicapSource ?? "unset"}
              {profile.handicapLastSyncedAt
                ? ` · recorded ${new Date(profile.handicapLastSyncedAt).toLocaleString()}`
                : ""}
            </span>
          )}
        </div>
      </div>

      <div className="border-t border-gray-200 pt-4 dark:border-gray-600">
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          GHIN link (confirm identity)
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Official GHIN lookup requires server credentials; self-hosted setups
          should enter handicap manually above. Optionally store your GHIN id
          and confirm your name here for future sync.
        </p>
        <div className="mt-3 flex flex-col gap-3 sm:max-w-md">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-600 dark:text-gray-300">
              GHIN number
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={profile.ghinNumber}
              onChange={(e) =>
                updateProfile({
                  ghinNumber: e.target.value,
                  ghinLinkConfirmed: false,
                })
              }
              className="app-focus-ring rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-600 dark:text-gray-300">
              Golfer display name (exactly as GHIN lists)
            </span>
            <input
              type="text"
              value={profile.golferDisplayName}
              onChange={(e) =>
                updateProfile({
                  golferDisplayName: e.target.value,
                  ghinLinkConfirmed: false,
                })
              }
              className="app-focus-ring rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
            <input
              type="checkbox"
              checked={profile.ghinLinkConfirmed}
              onChange={(e) =>
                updateProfile({ ghinLinkConfirmed: e.target.checked })
              }
              className="rounded border-gray-300 text-sky-600"
            />
            I confirm this GHIN belongs to me and matches the display name
            above.
          </label>
          <button
            type="button"
            disabled={ghinBusy}
            onClick={() => void tryGhinSync()}
            className={clsx(
              "app-focus-ring rounded-md px-4 py-2 text-sm font-medium text-white",
              ghinBusy ? "bg-sky-300" : "bg-sky-600 hover:bg-sky-500",
            )}
          >
            {ghinBusy ? "Trying GHIN…" : "Try GHIN lookup (needs server)"}
          </button>
          {ghinMsg && (
            <p className="text-xs text-amber-800 dark:text-amber-200">
              {ghinMsg}
            </p>
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
              onChange={(e) => {
                setLoftClubSelect(e.target.value);
                if (e.target.value !== CUSTOM_CLUB_VALUE) {
                  setLoftClubCustom("");
                }
              }}
              className="app-focus-ring w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="">Select club label…</option>
              {COMMON_GOLF_CLUB_LABELS.map((club) => (
                <option key={club} value={club}>
                  {club}
                </option>
              ))}
              <option value={CUSTOM_CLUB_VALUE}>
                Other — type exact CSV label…
              </option>
            </select>
          </label>
          {loftClubSelect === CUSTOM_CLUB_VALUE && (
            <input
              type="text"
              placeholder="Exact label from CSV"
              value={loftClubCustom}
              onChange={(e) => setLoftClubCustom(e.target.value)}
              className="app-focus-ring min-w-40 flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
          )}
          <input
            type="number"
            step="0.5"
            min={10}
            max={90}
            placeholder="°"
            value={loftDeg}
            onChange={(e) => setLoftDeg(e.target.value)}
            className="app-focus-ring w-24 rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
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
