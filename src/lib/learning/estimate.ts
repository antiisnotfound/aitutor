import { CUMULATIVE_HOURS, nextLevel, PAIR_DIFFICULTY, type CefrLevel } from "@/config/learning";

export type DurationEstimate = { unit: "weeks" | "months" | "years"; count: number };

/** Rough study days → a friendly "about N weeks/months/years". */
export function toFriendlyDuration(days: number): DurationEstimate {
  if (days < 56) return { unit: "weeks", count: Math.max(1, Math.round(days / 7)) };
  const months = Math.round(days / 30.44);
  if (months < 24) return { unit: "months", count: months };
  return { unit: "years", count: Math.round(months / 12) };
}

/**
 * Time to the next CEFR level:
 * remaining hours ÷ (daily minutes ÷ 60), scaled by the language pair's difficulty.
 * `progress` is the share (0–1) of the next level's can-dos already mastered.
 */
export function estimateToNextLevel(opts: {
  level: CefrLevel;
  progress: number;
  dailyMinutes: number;
  native: string;
  target: string;
}) {
  const next = nextLevel(opts.level);
  if (!next) return null;
  const span = CUMULATIVE_HOURS[next] - CUMULATIVE_HOURS[opts.level];
  const factor = PAIR_DIFFICULTY[`${opts.native}-${opts.target}`] ?? 1;
  const remainingHours = span * (1 - Math.min(1, Math.max(0, opts.progress))) * factor;
  const days = remainingHours / (opts.dailyMinutes / 60);
  return { next, remainingHours, days, friendly: toFriendlyDuration(days) };
}
