import { BasePageLayout } from "../components/base/BasePageLayout";
import { AllDataCombinedTable } from "../components/panels/AllDataCombinedTable";
import { AveragesTable } from "../components/panels/AveragesTable";

export const Sessions = () => (
  <BasePageLayout>
    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
      Sessions
    </h1>
    <AllDataCombinedTable />
    <AveragesTable />
  </BasePageLayout>
);
