import { useEffect, useMemo, useState } from "react";
import { useBestShots } from "../../utils/calculateAverages";
import { BaseLabel } from "../base/BaseLabel";
import { BaseListbox } from "../base/BaseListbox";
import { RangeBallBadge } from "../RangeBallBadge";
import { ClubStats } from "../ClubStats";
import { ClubTrendChart } from "./graphs/ClubTrendChart";
import { GappingChart } from "./graphs/GappingChart";
import { MetricTrendCard } from "./MetricTrendCard";

const toClubAnchorId = (clubName: string) =>
  `club-${clubName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`;

export const ClubDistances = () => {
  const { averages } = useBestShots();
  const [selectedClub, setSelectedClub] = useState("");
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [gappingDistanceMetric, setGappingDistanceMetric] = useState<
    "carry" | "total"
  >("carry");
  const clubOptions = useMemo(
    () =>
      averages
        .map((average) => average.name)
        .filter((clubName): clubName is string => Boolean(clubName)),
    [averages],
  );

  useEffect(() => {
    if (clubOptions.length === 0) {
      setSelectedClub("");
      return;
    }

    setSelectedClub((current) =>
      clubOptions.includes(current) ? current : clubOptions[0],
    );
  }, [clubOptions]);

  useEffect(() => {
    const onScroll = () => {
      setShowBackToTop(window.scrollY > 500);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const jumpToClub = (clubName: string) => {
    setSelectedClub(clubName);
    const clubId = toClubAnchorId(clubName);

    requestAnimationFrame(() => {
      document.getElementById(clubId)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const handleBackToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="relative flex flex-col gap-4">
      <MetricTrendCard title="Trends" />
      <div className="rounded-xl bg-white p-4 dark:bg-gray-800">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              Gapping Chart
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Compare average distance gaps between clubs to spot overlaps and
              missing yardages.
            </p>
          </div>
          <div
            className="inline-flex items-center gap-2 rounded-lg bg-gray-100 p-1 dark:bg-gray-700"
            role="group"
            aria-label="Select distance metric for gapping chart"
          >
            <button
              type="button"
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                gappingDistanceMetric === "carry"
                  ? "dark:text-brand-300 bg-white text-brand-700 shadow dark:bg-gray-800"
                  : "text-gray-700 hover:bg-white dark:text-gray-300 dark:hover:bg-gray-800"
              }`}
              onClick={() => setGappingDistanceMetric("carry")}
              aria-pressed={gappingDistanceMetric === "carry"}
            >
              Carry Distance
            </button>
            <button
              type="button"
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                gappingDistanceMetric === "total"
                  ? "dark:text-brand-300 bg-white text-brand-700 shadow dark:bg-gray-800"
                  : "text-gray-700 hover:bg-white dark:text-gray-300 dark:hover:bg-gray-800"
              }`}
              onClick={() => setGappingDistanceMetric("total")}
              aria-pressed={gappingDistanceMetric === "total"}
            >
              Total Distance
            </button>
            <RangeBallBadge className="ml-0 shrink-0" />
          </div>
        </div>
        <GappingChart distanceMetric={gappingDistanceMetric} />
      </div>
      <ClubTrendChart />
      <div className="rounded-xl bg-white p-4 dark:bg-gray-800">
        <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
          Club Distance Averages
        </h4>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            This panel shows the average stats of your 10 best shots.
          </p>
          <div className="w-full sm:max-w-56">
            <BaseLabel>Jump to club</BaseLabel>
            <BaseListbox
              options={clubOptions}
              setOption={jumpToClub}
              value={selectedClub}
              valueText={selectedClub || "No clubs"}
              ariaLabel="Select club to jump to stats"
            />
          </div>
        </div>
        <div className="flex flex-col gap-8">
          {averages.map((average) => (
            <div
              key={average.name}
              id={toClubAnchorId(average.name || "swing")}
              className="scroll-mt-24"
            >
              <ClubStats average={average} />
            </div>
          ))}
        </div>
      </div>
      {showBackToTop ? (
        <button
          type="button"
          onClick={handleBackToTop}
          className="app-focus-ring fixed bottom-6 right-6 z-30 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-brand-700"
          aria-label="Scroll back to top"
        >
          Back to top
        </button>
      ) : null}
    </div>
  );
};
