import { describe, expect, it } from "vitest";
import { summarizeShotShapeClusters } from "./shotShapeClusters";

describe("summarizeShotShapeClusters", () => {
  it("detects two_way pattern from mixed face-to-path signs", () => {
    const shots = [
      {
        "Face to Path": -4,
      },
      {
        "Face to Path": -3,
      },
      {
        "Face to Path": 5,
      },
      {
        "Face to Path": 6,
      },
      {
        "Face to Path": 0.5,
      },
    ];
    const s = summarizeShotShapeClusters(shots as Record<string, unknown>[]);
    expect(s.pattern).toBe("two_way");
    expect(s.closedToPathCount + s.openToPathCount).toBeGreaterThanOrEqual(4);
  });
});
