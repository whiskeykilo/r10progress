import { BasePageLayout } from "../components/base/BasePageLayout";
import { ClubDistances } from "../components/panels/ClubDistances.tsx";

export const Visualization = () => (
  <BasePageLayout title="Club Distances">
    <div className="rounded-md bg-white p-4 dark:bg-gray-800">
      <ClubDistances />
    </div>
  </BasePageLayout>
);
