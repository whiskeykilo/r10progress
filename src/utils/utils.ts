import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);

import { ClubDataForTable } from "../components/panels/AveragesPerSession";
import { GolfSwingData } from "../types/GolfSwingData";
import { Session } from "../types/Sessions";
import { AveragedSwing, AveragedSwingRecord } from "./calculateAverages";

export const sortGolfSwingKeysForHeader = (a: string, b: string) => {
  // We want to prioritize Carry Distance, Total Distance, Club Name, Ball Spped, and Date
  // over all other keys. This is because these keys are the most important ones to
  // compare swings.
  const prioritizedKeys = [
    "Carry Distance",
    "Carry-Distanz",
    "Total Distance",
    "Gesamtstrecke",
    "Club Type",
    "Club Speed",
    "Schl.gsch.",
    "Schlägerart",
    "Ball Speed",
    "Ballgeschwindigkeit",
    "Date",
    "Datum",
  ];

  // The first key should be Date / Datum or count for averages
  if (["Date", "Datum", "count"].includes(a)) {
    return -1;
  }
  if (["Date", "Datum", "count"].includes(b)) {
    return 1;
  }

  // The second key should be Club Type / Schlägerart, we check this first
  if (["Club Type", "Schlägerart", "name"].includes(a)) {
    return -1;
  }
  if (["Club Type", "Schlägerart", "name"].includes(b)) {
    return 1;
  }

  // Third should be Club Speed / Schl.gsch. / Ball Speed / Ballgeschwindigkeit
  if (
    ["Club Speed", "Schl.gsch.", "Ball Speed", "Ballgeschwindigkeit"].includes(
      a,
    )
  ) {
    return -1;
  }
  if (
    ["Club Speed", "Schl.gsch.", "Ball Speed", "Ballgeschwindigkeit"].includes(
      b,
    )
  ) {
    return 1;
  }

  // Fourth should be Total Distance / Gesamtstrecke
  if (["Total Distance", "Gesamtstrecke"].includes(a)) {
    return -1;
  }
  if (["Total Distance", "Gesamtstrecke"].includes(b)) {
    return 1;
  }

  // Fifth should be Carry Distance / Carry-Distanz
  if (["Carry Distance", "Carry-Distanz"].includes(a)) {
    return -1;
  }
  if (["Carry Distance", "Carry-Distanz"].includes(b)) {
    return 1;
  }

  // Sixth should be Smash Factor / Smash-Faktor
  if (["Smash Factor", "Smash-Faktor"].includes(a)) {
    return -1;
  }
  if (["Smash Factor", "Smash-Faktor"].includes(b)) {
    return 1;
  }

  // If both keys are in the list of prioritized keys, sort them alphabetically
  if (prioritizedKeys.includes(a) && prioritizedKeys.includes(b)) {
    return a.localeCompare(b);
  }

  if (prioritizedKeys.includes(a)) {
    return -1;
  }
  if (prioritizedKeys.includes(b)) {
    return 1;
  }

  // If both keys are not in the list of prioritized keys, sort them alphabetically
  return a.localeCompare(b);
};

function isCellEmptyForCount(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (value === "") return true;
  if (typeof value === "string" && value.trim() === "") return true;
  return false;
}

export const reduceSessionToDefinedValues: (session: Session) => Session = (
  session,
) => {
  const fieldValueCount: Record<keyof GolfSwingData, number> =
    session.results.reduce(
      (shot, curr) => {
        // Count the number of values for each field in the sessions results
        // @ts-expect-error - We know that the type will be correct
        Object.keys(curr).forEach((metric: keyof GolfSwingData) => {
          // Initialize the count for the field
          if (!shot[metric]) shot[metric] = 0;
          // Count present values (0 and false are valid numeric/boolean readings)
          const v = curr[metric];
          if (!isCellEmptyForCount(v)) {
            shot[metric] = (shot[metric] ?? 0) + 1;
          }
        });
        return shot;
      },
      {} as Record<keyof GolfSwingData, number>,
    );

  // Identify fields without any values
  const fieldsWithoutValues = Object.keys(fieldValueCount).filter(
    (key) => fieldValueCount[key as keyof GolfSwingData] === 0,
  );

  // Remove fields without values from session results
  const reducedResults = session.results.map((result) => {
    const newResult = { ...result };
    fieldsWithoutValues.forEach((key) => {
      delete newResult[key as keyof GolfSwingData];
    });
    return newResult;
  });

  const resultsWithFixedSquashFactor = reducedResults.map((result) => {
    if (result["Smash Factor"] < 0) {
      result["Smash Factor"] = 0;
    }
    return result;
  });

  return { ...session, results: resultsWithFixedSquashFactor };
};
// Get pairs of average / session date
export const getPairsForYfield: (
  averages: AveragedSwingRecord[],
  yField: keyof AveragedSwing,
) => ClubDataForTable = (sessions, yField) => {
  return sessions
    .map((session) =>
      session.averages.map((x) => ({
        x: session.displayName?.trim() || parseDate(session.date),
        y: x[yField],
        club: x.name,
      })),
    )
    .flat();
};

// Parse date to ISO8601 format using dayjs
// might be english or german format; Garmin often uses "M/D/YY HH:mm:ss"
export const parseDate = (input: string) => {
  const trimmed = input.trim();
  if (!trimmed) return "";

  const slashDatePart =
    trimmed.includes("/") && /\s/.test(trimmed)
      ? (trimmed.split(/\s+/)[0] ?? trimmed)
      : trimmed;

  if (slashDatePart.includes("/")) {
    const possibleDatFormats = [
      "MM/DD/YYYY",
      "MM/DD/YY",
      "M/DD/YYYY",
      "M/DD/YY",
      "MM/D/YYYY",
      "MM/D/YY",
      "M/D/YYYY",
      "M/D/YY",
    ];

    let date = "";

    const isDateParsed = possibleDatFormats.some((format) => {
      const parsedDate = dayjs(slashDatePart, format, true);
      if (parsedDate.isValid()) {
        date = parsedDate.format("YYYY-MM-DD");
        return true; // Stop iteration once a valid date is found
      }
      return false;
    });

    if (!isDateParsed) console.error("Could not parse date", input);

    return date;
  } else if (trimmed.includes(".")) {
    const parsed = dayjs(trimmed, "DD.MM.YY");
    const formatted = parsed.format("YYYY-MM-DD");
    return formatted;
  } else {
    return trimmed;
  }
};
