import { Link } from "react-router-dom";
import { BasePageLayout } from "../components/base/BasePageLayout";
import { DispersionGraphs } from "../components/DispersionGraphs";
import { AveragesPerSession } from "../components/panels/AveragesPerSession";
import { ShotScatterPlot } from "../components/panels/ShotScatterPlot";
import { useSelectedSessions } from "../hooks/useSelectedSessions";
import { dashboardRoutes } from "../routes";

export const Dashboard = () => {
  return (
    <BasePageLayout title="Dashboard">
      <NoSessionSelectedHint />
      <div className="flex flex-col gap-6">
        <DispersionGraphs />
        <AveragesPerSession />
        <ShotScatterPlot />
      </div>
    </BasePageLayout>
  );
};

const NoSessionSelectedHint = () => {
  const selectedSessions = useSelectedSessions();
  if (Object.keys(selectedSessions).length === 0) {
    return (
      <div className="rounded-md bg-yellow-100 p-4 dark:bg-yellow-900/30">
        <p className="text-lg font-semibold text-yellow-800 dark:text-yellow-200">
          No sessions selected
        </p>
        <p className="text-sm text-yellow-800 dark:text-yellow-300">
          You have not selected any sessions. Please select at least one session
          to view your averages.
        </p>
        <Link
          to={dashboardRoutes.upload}
          className="app-focus-ring mt-2 inline-block rounded-sm text-sm font-medium text-yellow-900 underline hover:text-yellow-700 dark:text-yellow-200 dark:hover:text-yellow-100"
        >
          Go to upload
        </Link>
      </div>
    );
  }

  return null;
};
