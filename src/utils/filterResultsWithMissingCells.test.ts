import { describe, expect, test } from "vitest";
import { filterResultsWithMissingCells } from "./filterResultsWithMissingCells";
import { Sessions } from "../types/Sessions";

describe("filterResultsWithMissingCells", () => {
  test("keeps rows where many numeric readings are legitimately zero", () => {
    const sessions = {
      a: {
        results: [
          {
            Date: "1/9/2026",
            "Ball Speed": 0,
            "Carry Distance": 0,
            "Club Speed": 100,
            "Total Distance": 150,
          },
        ],
        selected: true,
      },
    } as unknown as Sessions;

    const out = filterResultsWithMissingCells(sessions);
    expect(out.a.results.length).toBe(1);
  });

  test("drops empty parsed rows", () => {
    const sessions = {
      a: {
        results: [{}],
        selected: true,
      },
    } as unknown as Sessions;

    const out = filterResultsWithMissingCells(sessions);
    expect(out.a.results.length).toBe(0);
  });

  test("keeps sparse but valid Garmin rows", () => {
    const sessions = {
      a: {
        results: [
          {
            Date: "5/9/2026",
            "Club Type": "7 Iron",
            "Ball Speed": 103,
            "Carry Distance": 145,
            "Target Carry Distance": null,
            "Target Total Distance": null,
            Note: null,
            Tag: "",
            "Spin Axis": null,
          },
        ],
        selected: true,
      },
    } as unknown as Sessions;

    const out = filterResultsWithMissingCells(sessions);
    expect(out.a.results.length).toBe(1);
  });
});
