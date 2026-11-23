import type { TargetLanguage, UiLocale } from "./app";
import { LANGUAGE_PAIRS } from "./app";

export const CEFR_LEVELS = ["A0", "A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type CefrLevel = (typeof CEFR_LEVELS)[number];

/** Levels with full content in the MVP; the rest of the ladder is shown locked. */
export const UNLOCKED_LEVELS: readonly CefrLevel[] = ["A0", "A1"];

/** Approximate guided hours from zero to reach each level (brief §3). */
export const CUMULATIVE_HOURS: Record<CefrLevel, number> = {
  A0: 0, A1: 100, A2: 200, B1: 400, B2: 600, C1: 800, C2: 1100,
};

export const GOALS = ["trip", "work_study", "exam", "heritage", "moving", "words"] as const;
export type Goal = (typeof GOALS)[number];

export const SKILLS = ["speaking", "listening", "reading", "writing"] as const;
export type Skill = (typeof SKILLS)[number];

export const DAILY_MINUTES = [10, 15, 20, 30] as const;
export type DailyMinutes = (typeof DAILY_MINUTES)[number];

export const TUTOR_GENDERS = ["female", "male"] as const;
export type TutorGender = (typeof TUTOR_GENDERS)[number];

/** Tutor names match the target language. */
export const TUTORS: Record<TargetLanguage | "sq", Record<TutorGender, string>> = {
  it: { female: "Giulia", male: "Marco" },
  en: { female: "Emma", male: "James" },
  sq: { female: "Elira", male: "Arben" },
};

/**
 * Multiplier on study hours per language pair (1 = baseline).
 * Placeholder values: tune once we have real learner data.
 */
export const PAIR_DIFFICULTY: Record<string, number> = {
  "sq-en": 1,
  "sq-it": 1,
  "it-en": 1,
  "en-it": 1,
};

export function targetsFor(native: UiLocale): TargetLanguage[] {
  return LANGUAGE_PAIRS.filter((p) => p.native === native).map((p) => p.target);
}

export function nextLevel(level: CefrLevel): CefrLevel | null {
  const i = CEFR_LEVELS.indexOf(level);
  return CEFR_LEVELS[i + 1] ?? null;
}

/** Line the tutor says in the voice preview, in the target language. */
export const TUTOR_PREVIEW_LINE: Record<TargetLanguage | "sq", (name: string) => string> = {
  it: (n) => `Ciao! Sono ${n}. Parliamo un po' insieme?`,
  en: (n) => `Hi! I'm ${n}. Shall we have a chat?`,
  sq: (n) => `Përshëndetje! Unë jam ${n}. A flasim pak bashkë?`,
};

/** BCP-47 tags for speech features. */
export const SPEECH_LANG: Record<TargetLanguage | "sq", string> = {
  it: "it-IT",
  en: "en-GB",
  sq: "sq-AL",
};
