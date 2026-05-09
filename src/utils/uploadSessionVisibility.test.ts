import { describe, expect, test } from "vitest";
import { Session } from "../types/Sessions";
import {
  assertUploadVisibleInSnapshot,
  visibleShotCountForSession,
} from "./uploadSessionVisibility";

function minimalSession(results: Session["results"]): Session {
  return {
    results,
    selected: true,
    date: "1/1/2026",
  };
}

describe("uploadSessionVisibility", () => {
  test("visibleShotCountForSession keeps sparse Garmin-style rows", () => {
    const session = minimalSession([
      {
        Date: "5/9/2026",
        "Club Type": "7 Iron",
        "Ball Speed": 103,
        "Carry Distance": 145,
        "Target Carry Distance": null,
        Note: null,
        Tag: "",
      } as unknown as Session["results"][number],
    ]);
    expect(visibleShotCountForSession(session)).toBe(1);
  });

  test("assertUploadVisibleInSnapshot throws when snapshot missing", () => {
    expect(() => assertUploadVisibleInSnapshot("f.csv", undefined)).toThrow(
      /Could not load sessions/,
    );
  });

  test("assertUploadVisibleInSnapshot throws when filename missing", () => {
    expect(() => assertUploadVisibleInSnapshot("missing.csv", {})).toThrow(
      /did not appear in the session list/,
    );
  });

  test("assertUploadVisibleInSnapshot throws when no visible rows", () => {
    const snap = {
      "a.csv": minimalSession([{} as Session["results"][number]]),
    };
    expect(() => assertUploadVisibleInSnapshot("a.csv", snap)).toThrow(
      /no shot rows are visible/,
    );
  });

  test("assertUploadVisibleInSnapshot passes when session has visible rows", () => {
    const snap = {
      "a.csv": minimalSession([
        { Date: "1/1/26", "Ball Speed": 100 } as Session["results"][number],
      ]),
    };
    expect(() => assertUploadVisibleInSnapshot("a.csv", snap)).not.toThrow();
  });
});
