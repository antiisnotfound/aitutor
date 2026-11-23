"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Choice } from "@/components/ui/choice";
import { LanguagePicker } from "@/components/language-picker";
import type { TargetLanguage, UiLocale } from "@/config/app";
import {
  DAILY_MINUTES,
  GOALS,
  SKILLS,
  targetsFor,
  TUTOR_GENDERS,
  TUTORS,
  type DailyMinutes,
  type Goal,
  type Skill,
  type TutorGender,
} from "@/config/learning";
import { Link } from "@/i18n/navigation";
import { estimateToNextLevel } from "@/lib/learning/estimate";
import type { LearnerProfile } from "@/lib/types";
import { saveOnboarding } from "./actions";
import { TutorVoicePreview } from "./voice-preview";

const STEPS = ["about", "plan", "tutor", "start"] as const;
type Step = (typeof STEPS)[number];

export function OnboardingWizard({
  locale,
  needsAgeGroup,
  existing,
}: {
  locale: UiLocale;
  needsAgeGroup: boolean;
  existing: LearnerProfile | null;
}) {
  const t = useTranslations("onboarding");
  const tl = useTranslations("login");
  const tc = useTranslations("common");

  const targets = targetsFor(locale);
  const [step, setStep] = useState<Step>("about");
  const [ageGroup, setAgeGroup] = useState<"kid" | "teen" | "adult" | null>(null);
  const [target, setTarget] = useState<TargetLanguage>(
    existing && targets.includes(existing.targetLanguage) ? existing.targetLanguage : targets[0],
  );
  const [goal, setGoal] = useState<Goal | null>(existing?.goal ?? null);
  const [skills, setSkills] = useState<Skill[]>(existing?.focusSkills ?? ["speaking"]);
  const [minutes, setMinutes] = useState<DailyMinutes>(existing?.dailyMinutes ?? 15);
  const [tutor, setTutor] = useState<TutorGender>(existing?.tutorGender ?? "female");
  const [error, setError] = useState(false);
  const [saving, startSaving] = useTransition();

  const index = STEPS.indexOf(step);
  const tutorName = TUTORS[target][tutor];
  const level = existing?.targetLanguage === target ? existing.level : "A0";
  const estimate = estimateToNextLevel({ level, progress: 0, dailyMinutes: minutes, native: locale, target });

  const canContinue = {
    about: !needsAgeGroup || ageGroup === "teen" || ageGroup === "adult",
    plan: goal !== null && skills.length > 0,
    tutor: true,
    start: !saving,
  }[step];

  function next() {
    if (step !== "start") return setStep(STEPS[index + 1]);
    setError(false);
    startSaving(async () => {
      const result = await saveOnboarding({
        nativeLanguage: locale,
        ageGroup: ageGroup === "teen" || ageGroup === "adult" ? ageGroup : undefined,
        targetLanguage: target,
        goal: goal!,
        focusSkills: skills,
        dailyMinutes: minutes,
        tutorGender: tutor,
      });
      if (result?.error) setError(true);
    });
  }

  const toggleSkill = (s: Skill) =>
    setSkills((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  return (
    <div className="flex flex-1 flex-col">
      {/* Progress header */}
      <div className="mb-8">
        <div className="flex min-h-tap items-center justify-between">
          {index > 0 ? (
            <button
              type="button"
              onClick={() => setStep(STEPS[index - 1])}
              className="min-h-tap pr-4 font-semibold text-link"
            >
              ← {t("back")}
            </button>
          ) : existing ? (
            <Link href="/home" className="flex min-h-tap items-center pr-4 font-semibold text-link">
              ← {t("back")}
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-muted">{t("stepOf", { current: index + 1, total: STEPS.length })}</span>
        </div>
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-surface"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-valuenow={index + 1}
          aria-label={t("stepOf", { current: index + 1, total: STEPS.length })}
        >
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${((index + 1) / STEPS.length) * 100}%` }} />
        </div>
      </div>

      <div className="flex-1">
        {step === "about" && (
          <section aria-labelledby="step-title" className="flex flex-col gap-8">
            <h1 id="step-title" className="font-display text-3xl">{t("about.title")}</h1>
            <div>
              <LanguagePicker label={t("about.native")} />
              <p className="mt-2 text-sm text-muted">{t("about.nativeHint")}</p>
            </div>
            {needsAgeGroup && (
              <fieldset>
                <legend className="mb-2 text-sm font-medium text-muted">{tl("ageGroup")}</legend>
                <div className="flex flex-col gap-2">
                  {(["kid", "teen", "adult"] as const).map((g) => (
                    <Choice key={g} type="radio" name="ageGroup" value={g} checked={ageGroup === g} onChange={() => setAgeGroup(g)} variant="segment">
                      {tl(g === "kid" ? "ageKid" : g === "teen" ? "ageTeen" : "ageAdult")}
                    </Choice>
                  ))}
                </div>
                {ageGroup === "kid" && (
                  <p className="mt-3 rounded-xl bg-surface-2 p-3 text-sm">
                    {tl("kidNotice")}{" "}
                    <Link href="/parent-signup" className="font-semibold text-link underline underline-offset-4">
                      {tl("parentLink")}
                    </Link>
                  </p>
                )}
              </fieldset>
            )}
          </section>
        )}

        {step === "plan" && (
          <section aria-labelledby="step-title" className="flex flex-col gap-7">
            <h1 id="step-title" className="font-display text-3xl">{t("plan.title")}</h1>

            <fieldset>
              <legend className="mb-2 text-sm font-medium text-muted">{t("plan.target")}</legend>
              <div className="flex flex-wrap gap-2">
                {targets.map((l) => (
                  <Choice key={l} type="radio" name="target" value={l} checked={target === l} onChange={() => setTarget(l)}>
                    {tc(`languages.${l}`)}
                  </Choice>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-sm font-medium text-muted">{t("plan.goal")}</legend>
              <div className="flex flex-wrap gap-2">
                {GOALS.map((g) => (
                  <Choice key={g} type="radio" name="goal" value={g} checked={goal === g} onChange={() => setGoal(g)}>
                    {t(`goals.${g}`)}
                  </Choice>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-sm font-medium text-muted">
                {t("plan.skills")} <span className="font-normal">· {t("plan.skillsHint")}</span>
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {SKILLS.map((s) => (
                  <Choice key={s} type="checkbox" name="skills" value={s} checked={skills.includes(s)} onChange={() => toggleSkill(s)} variant="segment">
                    {skills.includes(s) ? "✓ " : ""}
                    {t(`skills.${s}`)}
                  </Choice>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-sm font-medium text-muted">{t("plan.daily")}</legend>
              <div className="flex gap-2">
                {DAILY_MINUTES.map((m) => (
                  <Choice key={m} type="radio" name="minutes" value={String(m)} checked={minutes === m} onChange={() => setMinutes(m)} variant="segment">
                    {t("plan.minutes", { n: m })}
                  </Choice>
                ))}
              </div>
              {estimate && (
                <p className="mt-3 rounded-xl bg-surface-2 p-3 text-sm" aria-live="polite">
                  {tc(`estimate.${estimate.friendly.unit}`, {
                    count: estimate.friendly.count,
                    minutes,
                    level: estimate.next,
                  })}
                </p>
              )}
            </fieldset>
          </section>
        )}

        {step === "tutor" && (
          <section aria-labelledby="step-title" className="flex flex-col gap-6">
            <h1 id="step-title" className="font-display text-3xl">{t("tutor.title")}</h1>
            <fieldset>
              <legend className="sr-only">{t("tutor.title")}</legend>
              <div className="grid grid-cols-2 gap-3">
                {TUTOR_GENDERS.map((g) => {
                  const name = TUTORS[target][g];
                  return (
                    <Choice key={g} type="radio" name="tutor" value={g} checked={tutor === g} onChange={() => setTutor(g)} variant="card">
                      <span
                        aria-hidden="true"
                        className={`mb-2 grid size-20 place-items-center rounded-full font-display text-3xl ${
                          tutor === g ? "bg-navy text-lime" : "bg-surface-2 text-fg"
                        }`}
                      >
                        {name[0]}
                      </span>
                      <span className="text-lg">{name}</span>
                      <span className="text-xs font-normal">{t("tutor.speaks", { language: tc(`languagesInline.${target}`) })}</span>
                    </Choice>
                  );
                })}
              </div>
            </fieldset>
            <TutorVoicePreview target={target} gender={tutor} name={tutorName} />
            <p className="text-sm text-muted">{t("tutor.namesNote")}</p>
          </section>
        )}

        {step === "start" && (
          <section aria-labelledby="step-title" className="flex flex-col gap-4">
            <h1 id="step-title" className="font-display text-3xl">{t("start.title")}</h1>
            <p className="text-lg">{t("start.body", { name: tutorName })}</p>
            <p className="text-sm text-muted">{t("start.note")}</p>
          </section>
        )}
      </div>

      <div className="sticky bottom-0 mt-8 bg-bg pb-4 pt-2">
        {error && (
          <p role="alert" className="mb-3 rounded-xl bg-red-950/60 p-3 text-sm text-red-100">
            {t("errors.generic")}
          </p>
        )}
        <button
          type="button"
          onClick={next}
          disabled={!canContinue}
          className="min-h-tap w-full rounded-xl bg-accent px-4 font-bold text-on-accent disabled:opacity-50"
        >
          {step === "start" ? (saving ? t("saving") : t("finish")) : t("continue")}
        </button>
      </div>
    </div>
  );
}
