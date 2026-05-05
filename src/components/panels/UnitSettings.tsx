import clsx from "clsx";
import { useSettings } from "../../provider/SettingsContext";

const units = [
  { value: "yards" as const, label: "Yards" },
  { value: "meters" as const, label: "Meters" },
];

export const UnitSettings = () => {
  const { settings, setSettings } = useSettings();

  return (
    <div className="flex gap-2">
      {units.map((u) => (
        <button
          key={u.value}
          type="button"
          onClick={() => setSettings((prev) => ({ ...prev, unit: u.value }))}
          className={clsx(
            "rounded-lg px-5 py-2 text-sm font-medium transition-colors",
            settings.unit === u.value
              ? "bg-sky-600 text-white shadow-sm"
              : "bg-white text-gray-700 ring-1 ring-gray-300 hover:bg-sky-50 hover:text-sky-700 dark:bg-gray-600 dark:text-gray-200 dark:ring-gray-500 dark:hover:bg-gray-500",
          )}
        >
          {u.label}
        </button>
      ))}
    </div>
  );
};
