import type { AgeGroup } from "@/config/app";

/** Cookie used by the Profile "kids look" preview toggle. */
export const THEME_COOKIE = "ui-theme";

export type Theme = "adult" | "kids";

export function themeFor(ageGroup: AgeGroup | null, override?: string): Theme {
  if (override === "kids" || override === "adult") return override;
  return ageGroup === "kid" ? "kids" : "adult";
}
