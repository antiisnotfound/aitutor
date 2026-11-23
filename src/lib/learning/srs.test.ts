import { describe, expect, it } from "vitest";
import { lapse, schedule } from "./srs";

const now = new Date("2026-11-23T12:00:00Z");
const fresh = { dueAt: now.toISOString(), intervalDays: 1, ease: 2.5, reps: 0, lapses: 0 };
const days = (iso: string) => (Date.parse(iso) - now.getTime()) / 86_400_000;

describe("schedule", () => {
  it("good: 1 day, then 3 days, then interval × ease", () => {
    const a = schedule(fresh, "good", now);
    expect(a.intervalDays).toBe(1);
    expect(days(a.dueAt)).toBeCloseTo(1);
    const b = schedule(a, "good", now);
    expect(b.intervalDays).toBe(3);
    const c = schedule(b, "good", now);
    expect(c.intervalDays).toBe(7.5);
    expect(c.reps).toBe(3);
  });

  it("easy grows faster and raises ease", () => {
    const a = schedule(fresh, "easy", now);
    expect(a.intervalDays).toBe(3);
    expect(a.ease).toBe(2.65);
  });

  it("again resets reps, lowers ease, counts a lapse and returns in 10 minutes", () => {
    const learned = { ...fresh, reps: 4, intervalDays: 20 };
    const a = schedule(learned, "again", now);
    expect(a.reps).toBe(0);
    expect(a.lapses).toBe(1);
    expect(a.ease).toBe(2.3);
    expect(days(a.dueAt) * 24 * 60).toBeCloseTo(10);
  });

  it("ease never drops below 1.3", () => {
    let s = fresh;
    for (let i = 0; i < 20; i++) s = schedule(s, "again", now);
    expect(s.ease).toBe(1.3);
  });

  it("hard grows the interval a little", () => {
    const s = schedule({ ...fresh, reps: 3, intervalDays: 10 }, "hard", now);
    expect(s.intervalDays).toBe(12);
    expect(s.ease).toBe(2.35);
  });

  it("caps the interval at a year", () => {
    const s = schedule({ ...fresh, reps: 9, intervalDays: 300, ease: 3 }, "easy", now);
    expect(s.intervalDays).toBe(365);
  });
});

describe("lapse", () => {
  it("makes the item due immediately", () => {
    const s = lapse({ ...fresh, reps: 3, intervalDays: 8 }, now);
    expect(s.dueAt).toBe(now.toISOString());
    expect(s.lapses).toBe(1);
  });
});
