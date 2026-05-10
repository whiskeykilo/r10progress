import type { DeterministicReportBundle } from "../schema/aiReport";
import type { ShotAggregate } from "./aggregate";
import { estimatePenaltyStrokesPerRound } from "./penaltyEstimator";

export const SCORE_RUBRIC_DISCLOSURE =
  "0–100 scores follow the model rubric: absolute skill (50≈average amateur, 70 solid, 85 strong amateur, 95+ elite); consistency from repeatability (std / dispersion), not the mean alone; Performance Overview rolls those dimensions into headline consistency / accuracy / efficiency scores.";

const DEFAULT_FAIRWAY_WIDTH_YDS = 32;
const DEFAULT_HAZARD_DRIVER_HOLES = 6;
const TARGET_DRIVER_ELLIPSE_YDS = 60;

export function buildDeterministicReportBundle(params: {
  aggregate: ShotAggregate;
  ballFlightContradictions: string[];
  dPlaneCitation: string;
  sampleTier: DeterministicReportBundle["sampleTier"];
  guardrailNotes: string[];
}): DeterministicReportBundle {
  const {
    aggregate,
    ballFlightContradictions,
    dPlaneCitation,
    sampleTier,
    guardrailNotes,
  } = params;

  const driver = aggregate.clubs.find((c) =>
    c.clubName.toLowerCase().includes("driver"),
  );

  let penaltyEstimate: DeterministicReportBundle["penaltyEstimate"] = null;
  if (driver && driver.dispersion.ellipse.width > 0) {
    const w = driver.dispersion.ellipse.width;
    const base = estimatePenaltyStrokesPerRound({
      ellipseWidthYds: w,
      fairwayWidthYds: DEFAULT_FAIRWAY_WIDTH_YDS,
      hazardAdjacentDriverHoles: DEFAULT_HAZARD_DRIVER_HOLES,
      strokesPerHazardEvent: 1,
    });
    const atTargetRaw =
      w > TARGET_DRIVER_ELLIPSE_YDS
        ? estimatePenaltyStrokesPerRound({
          ellipseWidthYds: TARGET_DRIVER_ELLIPSE_YDS,
          fairwayWidthYds: DEFAULT_FAIRWAY_WIDTH_YDS,
          hazardAdjacentDriverHoles: DEFAULT_HAZARD_DRIVER_HOLES,
          strokesPerHazardEvent: 1,
        })
        : null;

    penaltyEstimate = {
      baseline: {
        ellipseWidthYds: w,
        fairwayWidthYds: DEFAULT_FAIRWAY_WIDTH_YDS,
        hazardAdjacentDriverHoles: DEFAULT_HAZARD_DRIVER_HOLES,
        sigmaYds: base.sigmaYds,
        probabilityOutsideFairwayPerTeeShot:
          base.probabilityOutsideFairwayPerTeeShot,
        expectedPenaltyStrokesPerRound: base.expectedPenaltyStrokesPerRound,
      },
      targetWidthYds: atTargetRaw ? TARGET_DRIVER_ELLIPSE_YDS : null,
      atTarget: atTargetRaw
        ? {
          ellipseWidthYds: TARGET_DRIVER_ELLIPSE_YDS,
          fairwayWidthYds: DEFAULT_FAIRWAY_WIDTH_YDS,
          hazardAdjacentDriverHoles: DEFAULT_HAZARD_DRIVER_HOLES,
          sigmaYds: atTargetRaw.sigmaYds,
          probabilityOutsideFairwayPerTeeShot:
            atTargetRaw.probabilityOutsideFairwayPerTeeShot,
          expectedPenaltyStrokesPerRound:
            atTargetRaw.expectedPenaltyStrokesPerRound,
        }
        : null,
    };
  }

  const clubDispersionRobust = aggregate.clubs.map((c) => ({
    clubName: c.clubName,
    shotCount: c.shotCount,
    medianSignedDeviationYds: c.lateralRobust.medianSigned,
    iqrSignedDeviationYds: c.lateralRobust.iqr,
    tukeyLowOutliers: c.lateralRobust.tukeyLowOutliers,
    tukeyHighOutliers: c.lateralRobust.tukeyHighOutliers,
    shotShapePattern: c.shotShape.pattern,
  }));

  return {
    ballFlightContradictions,
    dPlaneCitation,
    sampleTier,
    guardrailNotes,
    scoreRubricDisclosure: SCORE_RUBRIC_DISCLOSURE,
    penaltyEstimate,
    clubDispersionRobust,
  };
}
