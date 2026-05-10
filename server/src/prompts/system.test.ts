import { describe, expect, it } from "vitest";
import { SYSTEM_PROMPT } from "./system";

/** Locks in Garmin R10 accuracy-awareness content in the AI system prompt. */
describe("SYSTEM_PROMPT", () => {
  it("documents Garmin support source and measured vs derived metrics", () => {
    expect(SYSTEM_PROMPT).toContain(
      "https://support.garmin.com/en-US/?faq=kj37CgzvwM98hC9WPrIQm5",
    );
    expect(SYSTEM_PROMPT).toMatch(/Directly measured/i);
    expect(SYSTEM_PROMPT).toMatch(/Ball speed/i);
    expect(SYSTEM_PROMPT).toMatch(/Club speed/i);
    expect(SYSTEM_PROMPT).toMatch(/Calculated\s*\/\s*derived/i);
    expect(SYSTEM_PROMPT).toMatch(/Spin rate/i);
    expect(SYSTEM_PROMPT).toMatch(/Club path/i);
  });

  it("includes published tolerance bands for interpretation", () => {
    expect(SYSTEM_PROMPT).toMatch(/±1 mph/i);
    expect(SYSTEM_PROMPT).toMatch(/±3 mph/i);
    expect(SYSTEM_PROMPT).toMatch(/±1°/);
    expect(SYSTEM_PROMPT).toMatch(/±2°/);
    expect(SYSTEM_PROMPT).toMatch(/±5 yards/i);
    expect(SYSTEM_PROMPT).toMatch(/±5 feet/i);
  });

  it("instructs confidence-aware use of measured vs modeled fields", () => {
    expect(SYSTEM_PROMPT).toMatch(/Confidence-aware analysis/i);
    expect(SYSTEM_PROMPT).toMatch(/radar-primary/i);
  });

  it("requires tagged common issues for strategy vs mechanics", () => {
    expect(SYSTEM_PROMPT).toMatch(/tag.*strategy.*mechanics/i);
  });
});
