"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { TARGET_LANGUAGES, UI_LOCALES } from "@/config/app";
import { DAILY_MINUTES, GOALS, SKILLS, targetsFor, TUTOR_GENDERS } from "@/config/learning";
import { readDemo, writeDemo } from "@/lib/demo";
import { createClient } from "@/lib/supabase/server";

const OnboardingSchema = z
  .object({
    nativeLanguage: z.enum(UI_LOCALES),
    ageGroup: z.enum(["teen", "adult"]).optional(),
    targetLanguage: z.enum(TARGET_LANGUAGES),
    goal: z.enum(GOALS),
    focusSkills: z.array(z.enum(SKILLS)).min(1),
    dailyMinutes: z.literal(DAILY_MINUTES),
    tutorGender: z.enum(TUTOR_GENDERS),
  })
  .refine((v) => targetsFor(v.nativeLanguage).includes(v.targetLanguage), {
    message: "Unsupported language pair",
  });

export type OnboardingInput = z.input<typeof OnboardingSchema>;

export async function saveOnboarding(input: OnboardingInput): Promise<{ error: string }> {
  const parsed = OnboardingSchema.safeParse(input);
  if (!parsed.success) return { error: "invalid" };
  const v = parsed.data;
  const focusSkills = [...new Set(v.focusSkills)];
  const done = () => redirect(`/${v.nativeLanguage}/home`);

  // Demo mode: everything goes into the demo cookie.
  const demo = await readDemo();
  if (demo) {
    const sameLanguage = demo.learner?.targetLanguage === v.targetLanguage;
    await writeDemo({
      ...demo,
      nativeLanguage: v.nativeLanguage,
      ageGroup: demo.ageGroup ?? v.ageGroup ?? null,
      learner: {
        id: sameLanguage ? demo.learner!.id : `demo-${v.targetLanguage}`,
        targetLanguage: v.targetLanguage,
        level: sameLanguage ? demo.learner!.level : "A0",
        placementDone: sameLanguage ? demo.learner!.placementDone : false,
        goal: v.goal,
        focusSkills,
        dailyMinutes: v.dailyMinutes,
        tutorGender: v.tutorGender,
      },
    });
    return done();
  }

  const supabase = await createClient();
  if (!supabase) return { error: "generic" };
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "generic" };
  const userId = auth.user.id;

  // Profile: native language, active language, and age group if still missing.
  const { data: profile } = await supabase
    .from("profiles").select("age_group").eq("id", userId).maybeSingle();
  const profileUpdate: Record<string, string> = {
    native_language: v.nativeLanguage,
    active_language: v.targetLanguage,
  };
  if (!profile?.age_group && v.ageGroup) profileUpdate.age_group = v.ageGroup;
  const { error: pErr } = await supabase.from("profiles").update(profileUpdate).eq("id", userId);
  if (pErr) return { error: "generic" };

  // Learner profile for this target language: update if it exists, else create.
  const plan = {
    goal: v.goal,
    focus_skills: focusSkills,
    daily_minutes: v.dailyMinutes,
    tutor_gender: v.tutorGender,
  };
  const { data: existing } = await supabase
    .from("learner_profiles").select("id")
    .eq("user_id", userId).eq("target_language", v.targetLanguage).maybeSingle();

  const { error: lErr } = existing
    ? await supabase.from("learner_profiles").update(plan).eq("id", existing.id)
    : await supabase.from("learner_profiles").insert({ ...plan, user_id: userId, target_language: v.targetLanguage });
  if (lErr) return { error: "generic" };

  return done();
}
