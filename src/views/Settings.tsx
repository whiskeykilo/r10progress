import clsx from "clsx";
import { SessionList } from "../components/SessionList";
import { BasePageLayout } from "../components/base/BasePageLayout";
import { OutlierDetectionSettings } from "../components/panels/OutlierDetectionSettings";
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
    <BasePageLayout>
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

        <SettingCard title="Sessions">
          <SessionList />
        </SettingCard>
      </div>
    </BasePageLayout>
  );
};
