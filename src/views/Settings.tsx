import clsx from "clsx";
import { SessionList } from "../components/SessionList";
import { BasePageLayout } from "../components/base/BasePageLayout";
import { OutlierDetectionSettings } from "../components/panels/OutlierDetectionSettings";
import { RangeBallCompensationSettings } from "../components/panels/RangeBallCompensationSettings";
import { UnitSettings } from "../components/panels/UnitSettings";
import { useDarkMode, type Theme } from "../hooks/useDarkMode";

const themeOptions: { value: Theme; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const SettingCard = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 dark:bg-gray-700 dark:ring-gray-600">
    <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
      {title}
    </h3>
    {children}
  </section>
);

export const Settings = () => {
  const { theme, setTheme } = useDarkMode();

  return (
    <BasePageLayout title="Settings">
      <div className="flex flex-col gap-4">
        <SettingCard title="Appearance">
          <div className="flex gap-2">
            {themeOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTheme(opt.value)}
                className={clsx(
                  "rounded-lg px-5 py-2 text-sm font-medium transition-colors",
                  theme === opt.value
                    ? "bg-sky-600 text-white shadow-sm"
                    : "bg-white text-gray-700 ring-1 ring-gray-300 hover:bg-sky-50 hover:text-sky-700 dark:bg-gray-600 dark:text-gray-200 dark:ring-gray-500 dark:hover:bg-gray-500",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </SettingCard>

        <SettingCard title="Units">
          <UnitSettings />
        </SettingCard>

        <SettingCard title="Outlier Detection">
          <OutlierDetectionSettings />
        </SettingCard>

        <SettingCard title="Distance Compensation">
          <RangeBallCompensationSettings />
        </SettingCard>

        <SettingCard title="Sessions">
          <SessionList />
        </SettingCard>

        <footer className="mt-2 flex justify-center">
          <a
            href="https://github.com/whiskeykilo/r10progress"
            target="_blank"
            rel="noreferrer"
            className="app-focus-ring inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-gray-700 ring-1 ring-gray-200 transition hover:bg-gray-50 hover:text-gray-900 dark:bg-gray-700 dark:text-gray-100 dark:ring-gray-600 dark:hover:bg-gray-600"
            aria-label="Open GitHub project whiskeykilo/r10progress"
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="h-4 w-4 fill-current"
            >
              <path d="M12 .5A12 12 0 0 0 8.21 23.9c.6.11.82-.26.82-.58v-2.02c-3.34.73-4.04-1.41-4.04-1.41-.55-1.37-1.33-1.73-1.33-1.73-1.09-.73.08-.72.08-.72 1.2.08 1.84 1.22 1.84 1.22 1.08 1.82 2.83 1.3 3.52 1 .1-.76.42-1.3.76-1.6-2.67-.3-5.47-1.31-5.47-5.86 0-1.3.47-2.37 1.24-3.2-.12-.3-.54-1.5.12-3.11 0 0 1.02-.32 3.35 1.22a11.7 11.7 0 0 1 6.1 0c2.33-1.54 3.35-1.22 3.35-1.22.66 1.61.24 2.81.12 3.11.77.83 1.24 1.9 1.24 3.2 0 4.56-2.8 5.56-5.48 5.85.43.36.82 1.08.82 2.19v3.24c0 .32.22.69.83.58A12 12 0 0 0 12 .5Z" />
            </svg>
            <span>whiskeykilo/r10progress</span>
          </a>
        </footer>
      </div>
    </BasePageLayout>
  );
};
