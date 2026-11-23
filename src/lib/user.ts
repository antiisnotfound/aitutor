import "server-only";
import { connection } from "next/server";
import { cache } from "react";
import { UI_LOCALES, type UiLocale } from "@/config/app";
import { readDemo } from "@/lib/demo";
import { createClient } from "@/lib/supabase/server";
import type { CurrentUser, LearnerProfile, SkillStatus } from "@/lib/types";

const asLocale = (v: unknown): UiLocale =>
  UI_LOCALES.includes(v as UiLocale) ? (v as UiLocale) : "en";

type LearnerRow = {
  id: string; target_language: string; level: string; goal: string; focus_skills: string[];
  daily_minutes: number; tutor_gender: string; placement_done: boolean;
};

const toLearner = (r: LearnerRow): LearnerProfile => ({
  id: r.id,
  targetLanguage: r.target_language as LearnerProfile["targetLanguage"],
  level: r.level as LearnerProfile["level"],
  goal: r.goal as LearnerProfile["goal"],
  focusSkills: r.focus_skills as LearnerProfile["focusSkills"],
  dailyMinutes: r.daily_minutes as LearnerProfile["dailyMinutes"],
  tutorGender: r.tutor_gender as LearnerProfile["tutorGender"],
  placementDone: r.placement_done,
});

/** Signed-in user with profile + active learner profile. Null when signed out. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  await connection(); // always per-request, never prerendered
  const demo = await readDemo();
  if (demo) return { ...demo, demo: true };

  const supabase = await createClient();
  if (!supabase) return null;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, age_group, native_language, active_language")
    .eq("id", auth.user.id)
    .maybeSingle();

  let learner: LearnerProfile | null = null;
  if (profile?.active_language) {
    const { data } = await supabase
      .from("learner_profiles")
      .select("id, target_language, level, goal, focus_skills, daily_minutes, tutor_gender, placement_done")
      .eq("user_id", auth.user.id)
      .eq("target_language", profile.active_language)
      .maybeSingle();
    if (data) learner = toLearner(data as LearnerRow);
  }

  const meta = auth.user.user_metadata ?? {};
  return {
    id: auth.user.id,
    email: auth.user.email ?? null,
    displayName: profile?.display_name ?? meta.full_name ?? meta.name ?? null,
    ageGroup: profile?.age_group ?? null,
    nativeLanguage: asLocale(profile?.native_language ?? meta.native_language),
    learner,
    demo: false,
  };
});

/** Can-do id → status for a learner. Missing ids are "not seen". */
export async function getSkillMap(learnerId: string): Promise<Record<string, SkillStatus>> {
  if (await readDemo()) return {};
  const supabase = await createClient();
  if (!supabase) return {};
  const { data } = await supabase
    .from("skill_map_entries")
    .select("cando_id, status")
    .eq("learner_profile_id", learnerId);
  return Object.fromEntries((data ?? []).map((r) => [r.cando_id, r.status as SkillStatus]));
}
