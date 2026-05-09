import { useSettings } from "../provider/SettingsContext";

type RangeBallBadgeProps = {
  className?: string;
};

/** “E” when range ball distance compensation is enabled (native tooltip on hover). */
export const RangeBallBadge = ({ className = "" }: RangeBallBadgeProps) => {
  const { settings } = useSettings();
  if (!settings.applyRangeBallCompensation) return null;

  return (
    <abbr
      className={`ml-2 inline-flex cursor-help items-center rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700 no-underline dark:bg-sky-900/50 dark:text-sky-200 ${className}`.trim()}
      title="Estimated distance: range ball compensation is applied to carry and total distance fields. Imported raw data is unchanged."
      aria-label="Estimated distance; range ball compensation applied"
    >
      E
    </abbr>
  );
};
