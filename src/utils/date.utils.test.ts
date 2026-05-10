import { describe, expect, test } from "vitest";
import { getDateFromResults } from "./date.utils";
import { parseDate } from "./utils.ts";

describe("getDateFromResults", () => {
  test("uses first row with a shot date, skipping leading units row", () => {
    const results = [
      {
        Date: null,
        "Club Speed": "[mph]",
      },
      {
        Date: "5/7/26 14:13:28",
        "Club Speed": 83,
      },
    ];
    expect(getDateFromResults(results)).toBe("5/7/26");
  });

  test("returns empty string when no row has a date", () => {
    expect(getDateFromResults([{ Date: null }, { Date: null }])).toBe("");
  });
});

describe("parseDate", () => {
  test("parses Garmin slash datetime to ISO date", () => {
    expect(parseDate("5/7/26 14:13:28")).toBe("2026-05-07");
  });

  test("parses slash date without time", () => {
    expect(parseDate("5/7/26")).toBe("2026-05-07");
    expect(parseDate("12/31/2025")).toBe("2025-12-31");
  });
});
