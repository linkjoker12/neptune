import { describe, expect, it } from "vitest";
import { getCamelotNotation, getTempoRange } from "@/lib/musicTheory";

describe("music theory helpers", () => {
  it("maps common keys to Camelot notation", () => {
    expect(getCamelotNotation("F# minor")).toBe("11A");
    expect(getCamelotNotation("C major")).toBe("8B");
    expect(getCamelotNotation("Db major")).toBe("3B");
  });

  it("builds a rounded tempo range from available BPM values", () => {
    expect(getTempoRange([150, 145.4, null])).toEqual({ low: 145, high: 150 });
    expect(getTempoRange([undefined, null])).toBeNull();
  });
});
