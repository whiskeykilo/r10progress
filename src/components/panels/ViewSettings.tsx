import { useSettings } from "../../provider/SettingsContext";

export const ViewSettings = () => {
  const { settings, setSettings } = useSettings();

  return (
    <div className="mt-2 flex flex-col gap-3 pt-2">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            View: best shots only
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Shows only your better shots - useful for seeing your potential, but
            don&apos;t use this view for course-management distances.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={settings.useAboveAverageShots}
          onClick={() =>
            setSettings((prev) => ({
              ...prev,
              useAboveAverageShots: !prev.useAboveAverageShots,
            }))
          }
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-600 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
            settings.useAboveAverageShots
              ? "bg-sky-600"
              : "bg-gray-200 dark:bg-gray-600"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              settings.useAboveAverageShots ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>
    </div>
  );
};
