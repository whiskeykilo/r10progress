import { useContext } from "react";
import { Link } from "react-router-dom";
import { SettingsContext } from "../provider/SettingsContext";

export const IQRNote = () => {
  const { settings } = useContext(SettingsContext);
  const text = settings.useIQR
    ? "The averages are calculated using the Interquartile Range (IQR) method."
    : settings.useAboveAverageShots
      ? "The averages are calculated across all shots, and only shots above average are shown."
      : "The averages are calculated across all shots.";
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
