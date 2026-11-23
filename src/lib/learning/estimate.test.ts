import { describe, expect, it } from "vitest";
import { estimateToNextLevel, toFriendlyDuration } from "./estimate";

describe("estimateToNextLevel", () => {
  it("matches the brief: 15 min/day from zero ≈ 13 months to A1", () => {
    const e = estimateToNextLevel({ level: "A0", progress: 0, dailyMinutes: 15, native: "sq", target: "it" })!;
    expect(e.next).toBe("A1");
    expect(e.friendly).toEqual({ unit: "months", count: 13 });
  });
  it("shrinks with progress", () => {
    const e = estimateToNextLevel({ level: "A0", progress: 0.5, dailyMinutes: 30, native: "sq", target: "en" })!;
    expect(e.remainingHours).toBe(50);
  });
  it("returns null at the top level", () => {
    expect(estimateToNextLevel({ level: "C2", progress: 0, dailyMinutes: 30, native: "en", target: "it" })).toBeNull();
  });
});

describe("toFriendlyDuration", () => {
  it("uses weeks under 8 weeks and years from 24 months", () => {
    expect(toFriendlyDuration(20)).toEqual({ unit: "weeks", count: 3 });
    expect(toFriendlyDuration(800)).toEqual({ unit: "years", count: 2 });
  });
});
