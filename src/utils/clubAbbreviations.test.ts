import { describe, expect, test } from "vitest";
import { abbreviateClubName } from "./clubAbbreviations";

describe("abbreviateClubName", () => {
  test("woods, irons, hybrid, driver", () => {
    expect(abbreviateClubName("Driver")).toBe("D");
    expect(abbreviateClubName("3 Wood")).toBe("3w");
    expect(abbreviateClubName("5 wood")).toBe("5w");
    expect(abbreviateClubName("7 Iron")).toBe("7i");
    expect(abbreviateClubName("9 Eisen")).toBe("9i");
    expect(abbreviateClubName("4 Hybrid")).toBe("4h");
    expect(abbreviateClubName("3 Rescue")).toBe("3h");
  });

  test("wedges", () => {
    expect(abbreviateClubName("Pitching Wedge")).toBe("PW");
    expect(abbreviateClubName("Gap wedge")).toBe("GW");
    expect(abbreviateClubName("Sand Wedge")).toBe("SW");
    expect(abbreviateClubName("Lob-Wedge")).toBe("LW");
  });
});
