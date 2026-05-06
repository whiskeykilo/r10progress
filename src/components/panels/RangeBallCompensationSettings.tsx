import { ChangeEvent } from "react";
import clsx from "clsx";
import { useSettings } from "../../provider/SettingsContext";

type MultiplierKey =
  | "wedges"
  | "shortIrons"
  | "midLongIrons"
  | "hybridsWoodsDriver";

const multiplierFields: Array<{
  key: MultiplierKey;
  label: string;
}> = [
  { key: "wedges", label: "Wedges (LW, SW, GW, PW)" },
  { key: "shortIrons", label: "Short irons (9i, 8i)" },
  { key: "midLongIrons", label: "Mid/long irons (7i, 6i, 5i, 4i, 3i)" },
  {
    key: "hybridsWoodsDriver",
    label: "Hybrids, fairway woods, driver",
  },
];

export const RangeBallCompensationSettings = () => {
  const { settings, setSettings } = useSettings();

  const onMultiplierChange =
    (key: MultiplierKey) => (event: ChangeEvent<HTMLInputElement>) => {
      const parsed = Number(event.target.value);
      if (!Number.isFinite(parsed)) return;
      const value = Math.max(1, Math.min(1.5, parsed));
      setSettings((prev) => ({
        ...prev,
        rangeBallCompensation: {
          ...prev.rangeBallCompensation,
          [key]: value,
        },
      }));
    };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          Apply range ball compensation
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={settings.applyRangeBallCompensation}
          aria-label="Apply range ball compensation"
          onClick={() =>
            setSettings((prev) => ({
              ...prev,
              applyRangeBallCompensation: !prev.applyRangeBallCompensation,
            }))
          }
          className={clsx(
            "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-600 focus:ring-offset-2 dark:focus:ring-offset-gray-800",
            settings.applyRangeBallCompensation
              ? "bg-sky-600"
              : "bg-gray-200 dark:bg-gray-600",
          )}
        >
          <span
            className={clsx(
              "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
              settings.applyRangeBallCompensation
                ? "translate-x-5"
                : "translate-x-0",
            )}
          />
        </button>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        Distance fields only. Raw imported shot data remains unchanged.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {multiplierFields.map((field) => (
          <label key={field.key} className="flex flex-col gap-1">
            <span className="text-xs text-gray-700 dark:text-gray-300">
              {field.label}
            </span>
            <input
              type="number"
              min={1}
              max={1.5}
              step={0.01}
              value={settings.rangeBallCompensation[field.key]}
              onChange={onMultiplierChange(field.key)}
              className="app-focus-ring w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            />
          </label>
        ))}
      </div>
    </div>
  );
};
