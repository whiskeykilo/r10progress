import clsx from "clsx";
import { useSettings } from "../../provider/SettingsContext";

type ToggleProps = {
  checked: boolean;
  onChange: (val: boolean) => void;
  label: string;
  description?: string;
  tooltip?: string;
};

const Toggle = ({
  checked,
  onChange,
  label,
  description,
  tooltip,
}: ToggleProps) => (
  <div className="flex items-center justify-between gap-4">
    <div>
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          {label}
        </p>
        {tooltip && (
          <span
            className="inline-flex h-5 w-5 cursor-help items-center justify-center rounded-full border border-gray-300 text-xs font-semibold text-gray-500 dark:border-gray-600 dark:text-gray-300"
            title={tooltip}
            aria-label={tooltip}
          >
            ?
          </span>
        )}
      </div>
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
  const outlierMode = settings.useShotQualityFilter
    ? "shotQuality"
    : settings.useIQR
      ? "iqr"
      : "none";

  const setOutlierMode = (mode: "shotQuality" | "iqr" | "none") => {
    setSettings((prev) => ({
      ...prev,
      useShotQualityFilter: mode === "shotQuality",
      useIQR: mode === "iqr",
    }));
  };

  return (
    <div className="mt-2 flex flex-col gap-4 pt-2">
      <div>
        <p className="mb-2 text-sm font-medium text-gray-900 dark:text-white">
          Outlier method
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => setOutlierMode("shotQuality")}
            className={clsx(
              "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
              outlierMode === "shotQuality"
                ? "border-sky-600 bg-sky-50 text-sky-800 dark:border-sky-500 dark:bg-sky-900/40 dark:text-sky-100"
                : "border-gray-300 text-gray-700 hover:border-sky-400 dark:border-gray-600 dark:text-gray-200",
            )}
          >
            Shot quality
          </button>
          <button
            type="button"
            onClick={() => setOutlierMode("iqr")}
            className={clsx(
              "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
              outlierMode === "iqr"
                ? "border-sky-600 bg-sky-50 text-sky-800 dark:border-sky-500 dark:bg-sky-900/40 dark:text-sky-100"
                : "border-gray-300 text-gray-700 hover:border-sky-400 dark:border-gray-600 dark:text-gray-200",
            )}
          >
            IQR fallback
          </button>
          <button
            type="button"
            onClick={() => setOutlierMode("none")}
            className={clsx(
              "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
              outlierMode === "none"
                ? "border-sky-600 bg-sky-50 text-sky-800 dark:border-sky-500 dark:bg-sky-900/40 dark:text-sky-100"
                : "border-gray-300 text-gray-700 hover:border-sky-400 dark:border-gray-600 dark:text-gray-200",
            )}
          >
            Off
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          IQR fallback: statistical outlier removal based on total distance. Use
          if Shot Quality Filter does not have enough data.
        </p>
      </div>
      {settings.useShotQualityFilter ? (
        <Toggle
          checked={settings.shotQualitySdMode === "asymmetric"}
          onChange={(val) =>
            setSettings((prev) => ({
              ...prev,
              shotQualitySdMode: val ? "asymmetric" : "symmetric",
            }))
          }
          label="Shot quality filter range (recommended)"
          description="On: removes very short shots more aggressively and keeps more strong shots (2 SD low / 3 SD high). Off: uses the same 2 SD limit on both sides."
          tooltip="Smash-factor floor stays active for true irons. Asymmetric mode is more permissive on your best strikes."
        />
      ) : null}
    </div>
  );
};
