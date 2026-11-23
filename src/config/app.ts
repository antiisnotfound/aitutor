/**
 * Central app configuration. Product decisions that are still open
 * (app name, pass mark, check-in frequency…) live here so they can be
 * changed in one place.
 */

export const APP_NAME = "[APP NAME]";
export const PARTNER = { name: "Discover Albania", url: "https://discoveralbania.al" };

/** Interface (UI) languages. Also the learner's "native language" options. */
export const UI_LOCALES = ["en", "sq", "it"] as const;
export type UiLocale = (typeof UI_LOCALES)[number];

/** Languages a learner can study. */
export const TARGET_LANGUAGES = ["en", "it"] as const;
export type TargetLanguage = (typeof TARGET_LANGUAGES)[number];

/** MVP language pairs: native → target. */
export const LANGUAGE_PAIRS: ReadonlyArray<{ native: UiLocale; target: TargetLanguage }> = [
  { native: "sq", target: "en" },
  { native: "sq", target: "it" },
  { native: "it", target: "en" },
  { native: "en", target: "it" },
];

export const AGE_GROUPS = ["kid", "teen", "adult"] as const;
export type AgeGroup = (typeof AGE_GROUPS)[number];

/** Session timing (minutes). */
export const SESSION = { defaultMinutes: 15, hardCapMinutes: 30 } as const;

/** Defaults the brief marks as configurable. */
export const ASSESSMENT = {
  checkInEveryDays: 14,
  checkInQuestions: 10,
  levelUpPass: { overall: 0.7, minPerSkill: 0.5 },
  /** Share of the level's can-dos mastered before the level-up exam unlocks. */
  levelUpUnlockProgress: 0.6,
  /** Days to wait before retaking a failed level-up exam. */
  levelUpRetakeDays: 3,
} as const;
