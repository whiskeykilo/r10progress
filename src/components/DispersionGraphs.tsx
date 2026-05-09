import { BaseTabs } from "./base/BaseTabs";
import { RangeBallBadge } from "./RangeBallBadge";
import { AllShotsGraph } from "./panels/graphs/AllShotsGraph";
import { DispersionCirclesGraph } from "./panels/graphs/DispersionCirclesGraph";

export const DispersionGraphs = () => (
  <div className="flex h-auto flex-col gap-3 rounded-xl bg-white p-4 dark:bg-gray-800">
    <BaseTabs
      categories={{
        "All Shots": [
          {
            id: 1,
            content: (
              <div>
                <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                  <h4 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                    Shot Visualization
                  </h4>
                  <RangeBallBadge className="ml-0 shrink-0" />
                </div>
                <AllShotsGraph />
              </div>
            ),
          },
        ],
        Dispersion: [
          {
            id: 2,
            content: (
              <div>
                <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                  <h4 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                    Dispersion Circle Graph
                  </h4>
                  <RangeBallBadge className="ml-0 shrink-0" />
                </div>
                <DispersionCirclesGraph />
              </div>
            ),
          },
        ],
      }}
    />
  </div>
);
