import { ChangeEvent } from "react";
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
      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={settings.applyRangeBallCompensation}
          onChange={(event) =>
            setSettings((prev) => ({
              ...prev,
              applyRangeBallCompensation: event.target.checked,
            }))
          }
          className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
        />
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          Apply range ball compensation
        </span>
      </label>

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
