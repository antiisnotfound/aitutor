import { ASSESSMENT } from "@/config/app";
import type { StoredAttempt } from "@/lib/data/store";

const DAY = 86_400_000;

export type CheckinStatus = { due: boolean; dueInDays: number; lastScore: number | null; lastId: string | null };

/** Check-ins are due every N days (the first one right away). Learners may always take one early. */
export function checkinStatus(last: StoredAttempt | null, now = Date.now()): CheckinStatus {
  if (!last?.completedAt) return { due: true, dueInDays: 0, lastScore: null, lastId: null };
  const next = Date.parse(last.completedAt) + ASSESSMENT.checkInEveryDays * DAY;
  const days = Math.max(0, Math.ceil((next - now) / DAY));
  return { due: days === 0, dueInDays: days, lastScore: last.overall, lastId: last.id };
}

export type LevelUpStatus =
  | { state: "passed"; lastId: string }
  | { state: "locked"; progressNeeded: number }
  | { state: "cooldown"; availableInDays: number; lastId: string }
  | { state: "available"; lastId: string | null };

/** The exam unlocks at a share of mastered can-dos; a failed attempt can be retaken after a few days. */
export function levelUpStatus(opts: {
  last: StoredAttempt | null;
  progress: number;
  bypassGate?: boolean;
  now?: number;
}): LevelUpStatus {
  const now = opts.now ?? Date.now();
  const last = opts.last?.status === "graded" ? opts.last : null;
  if (last?.passed) return { state: "passed", lastId: last.id };
  if (!opts.bypassGate && opts.progress < ASSESSMENT.levelUpUnlockProgress) {
    return { state: "locked", progressNeeded: ASSESSMENT.levelUpUnlockProgress };
  }
  if (last?.completedAt) {
    const until = Date.parse(last.completedAt) + ASSESSMENT.levelUpRetakeDays * DAY;
    if (until > now) return { state: "cooldown", availableInDays: Math.ceil((until - now) / DAY), lastId: last.id };
  }
  return { state: "available", lastId: last?.id ?? null };
}
