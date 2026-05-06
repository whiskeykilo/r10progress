import { useSettings } from "../provider/SettingsContext";

export const RangeBallBadge = () => {
  const { settings } = useSettings();
  if (!settings.applyRangeBallCompensation) return null;

  return (
    <span
      className="ml-2 inline-flex items-center rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700 dark:bg-sky-900/50 dark:text-sky-200"
      title="Range ball compensation applied"
      aria-label="Range ball compensation applied"
    >
      RB+
    </span>
  );
};
