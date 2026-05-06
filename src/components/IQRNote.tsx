import { useContext } from "react";
import { Link } from "react-router-dom";
import { SettingsContext } from "../provider/SettingsContext";

export const IQRNote = () => {
  const { settings } = useContext(SettingsContext);
  const baseFilterText = settings.useShotQualityFilter
    ? "Averages use the Shot Quality filter."
    : settings.useIQR
      ? "Averages use IQR outlier removal."
      : "Averages include all shots.";
  const text = settings.useAboveAverageShots
    ? `${baseFilterText} View mode is set to best shots only.`
    : baseFilterText;
  return (
    <div className="flex flex-row gap-1">
      <p className="text-sm text-gray-500 dark:text-gray-400">{text}</p>
      <Link
        to="/settings"
        className="app-focus-ring dark:text-brand-400 rounded-sm text-sm text-brand-600 hover:underline"
      >
        Change settings
      </Link>
    </div>
  );
};
