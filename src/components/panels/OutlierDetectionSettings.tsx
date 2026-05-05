import clsx from "clsx";
import { useSettings } from "../../provider/SettingsContext";

type ToggleProps = {
  checked: boolean;
  onChange: (val: boolean) => void;
  label: string;
  description?: string;
};

const Toggle = ({ checked, onChange, label, description }: ToggleProps) => (
  <div className="flex items-center justify-between gap-4">
    <div>
      <p className="text-sm font-medium text-gray-900 dark:text-white">
        {label}
      </p>
      {description && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {description}
        </p>
      )}
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={clsx(
        "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-600 focus:ring-offset-2 dark:focus:ring-offset-gray-800",
        checked ? "bg-sky-600" : "bg-gray-200 dark:bg-gray-600",
      )}
    >
      <span
        className={clsx(
          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
          checked ? "translate-x-5" : "translate-x-0",
        )}
      />
    </button>
  </div>
);

export const OutlierDetectionSettings = () => {
  const { settings, setSettings } = useSettings();

  return (
    <div className="flex flex-col gap-4">
      <Toggle
        checked={settings.useIQR}
        onChange={(val) => setSettings((prev) => ({ ...prev, useIQR: val }))}
        label="IQR outlier detection"
        description="Filter shots that fall outside the interquartile range"
      />
      <Toggle
        checked={settings.useAboveAverageShots}
        onChange={(val) =>
          setSettings((prev) => ({ ...prev, useAboveAverageShots: val }))
        }
        label="Above-average shots only"
        description="Only include shots that are above your average"
      />
    </div>
  );
};
