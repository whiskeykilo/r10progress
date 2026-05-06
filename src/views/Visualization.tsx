import { BasePageLayout } from "../components/base/BasePageLayout";
import { ClubDistances } from "../components/panels/ClubDistances.tsx";

export const Visualization = () => (
  <BasePageLayout>
    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
      Club Distances
    </h1>
    <div className="rounded-md bg-white p-4 dark:bg-gray-800">
      <ClubDistances />
    </div>
  </BasePageLayout>
);
