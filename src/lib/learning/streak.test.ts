import { describe, expect, it } from "vitest";
import { streakDays } from "./streak";

const now = new Date("2026-11-23T12:00:00Z");
describe("streakDays", () => {
  it("counts consecutive days ending today", () => {
    expect(streakDays(["2026-11-23T08:00:00Z", "2026-11-22T20:00:00Z", "2026-11-21T09:00:00Z"], now)).toBe(3);
  });
  it("still counts when the last session was yesterday", () => {
    expect(streakDays(["2026-11-22T08:00:00Z", "2026-11-21T08:00:00Z"], now)).toBe(2);
  });
  it("breaks on a missed day", () => {
    expect(streakDays(["2026-11-23T08:00:00Z", "2026-11-21T08:00:00Z"], now)).toBe(1);
  });
  it("is zero with no recent sessions", () => {
    expect(streakDays([], now)).toBe(0);
  });
});
