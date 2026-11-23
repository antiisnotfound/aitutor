import type { SrsState } from "@/lib/data/store";

/** Learner's self-rating after revealing a card. */
export type ReviewGrade = "again" | "hard" | "good" | "easy";

const DAY = 86_400_000;
const MIN_EASE = 1.3;
const MAX_INTERVAL_DAYS = 365;

/**
 * SM-2-style scheduling (simplified, as used by many flashcard apps):
 * - again: relearn soon (10 min), ease −0.2, counts as a lapse
 * - hard:  interval ×1.2, ease −0.15
 * - good:  1 → 3 days, then interval × ease
 * - easy:  like good with a 1.3 bonus, ease +0.15
 */
export function schedule(prev: SrsState, grade: ReviewGrade, now = new Date()): SrsState {
  let { ease, intervalDays } = prev;
  const { reps, lapses } = prev;

  if (grade === "again") {
    return {
      ease: Math.max(MIN_EASE, ease - 0.2),
      intervalDays: 0,
      reps: 0,
      lapses: lapses + 1,
      dueAt: new Date(now.getTime() + 10 * 60_000).toISOString(),
    };
  }

  if (grade === "hard") {
    ease = Math.max(MIN_EASE, ease - 0.15);
    intervalDays = Math.max(1, intervalDays * 1.2);
  } else {
    if (reps === 0) intervalDays = grade === "easy" ? 3 : 1;
    else if (reps === 1) intervalDays = grade === "easy" ? 6 : 3;
    else intervalDays = intervalDays * ease * (grade === "easy" ? 1.3 : 1);
    if (grade === "easy") ease += 0.15;
  }

  intervalDays = Math.min(MAX_INTERVAL_DAYS, Math.round(intervalDays * 10) / 10);
  return {
    ease: Math.round(ease * 100) / 100,
    intervalDays,
    reps: reps + 1,
    lapses,
    dueAt: new Date(now.getTime() + intervalDays * DAY).toISOString(),
  };
}

/** A wrong answer in a quiz: bring the item back for review now. */
export function lapse(prev: SrsState, now = new Date()): SrsState {
  return { ...schedule(prev, "again", now), dueAt: now.toISOString() };
}
