import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ASSESSMENT } from "@/config/app";
import { initLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import type { ExamSkill } from "@/lib/assessment/types";
import { getStore } from "@/lib/data/store";
import { THEME_COOKIE, themeFor } from "@/lib/theme";
import { getCurrentUser } from "@/lib/user";

export async function generateMetadata({ params }: PageProps<"/[locale]/practice/results/[id]">): Promise<Metadata> {
  const locale = await initLocale(params);
  const t = await getTranslations({ locale, namespace: "results" });
  return { title: t("metaTitle") };
}

const SKILLS: ExamSkill[] = ["reading", "listening", "writing", "speaking"];

export default async function ResultsPage({ params }: PageProps<"/[locale]/practice/results/[id]">) {
  await initLocale(params);
  const { id } = await params;
  const [t, ta, user] = await Promise.all([getTranslations("results"), getTranslations("assessment"), getCurrentUser()]);
  if (!user?.learner) return null;
  const attempt = await (await getStore()).getAttempt(id, user.id);
  if (!attempt || attempt.status !== "graded") notFound();

  const kids = themeFor(user.ageGroup, (await cookies()).get(THEME_COOKIE)?.value) === "kids";
  const overall = Math.round((attempt.overall ?? 0) * 100);
  const exam = attempt.kind === "levelup";
  const rule = ASSESSMENT.levelUpPass;
  const toWorkOn = [
    ...(attempt.feedback?.weakSkills ?? []).map((s) => t("weakSkill", { skill: ta(`skills.${s}`) })),
    ...(attempt.feedback?.toWorkOn ?? []),
  ];
  const stars = (v: number) => Math.round(v * 5);

  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-5 px-4 py-8 md:max-w-2xl">
      <h1 className="font-display text-3xl">
        {exam ? (attempt.passed ? t("passedTitle") : t("notYetTitle")) : t("checkinTitle")}
      </h1>

      <div className="flex items-center gap-5">
        {kids ? (
          <p className="text-4xl tracking-widest text-teal-dark" aria-label={t("stars", { count: stars(attempt.overall ?? 0) })}>
            {"★".repeat(stars(attempt.overall ?? 0))}
            <span className="opacity-30">{"★".repeat(5 - stars(attempt.overall ?? 0))}</span>
          </p>
        ) : (
          <ScoreRing percent={overall} label={t("overall")} />
        )}
        <div>
          {exam && (
            <p className={`inline-block rounded-full px-3 py-1 text-sm font-bold ${attempt.passed ? "bg-accent text-on-accent" : "bg-surface-2"}`}>
              {attempt.passed ? t("passed") : t("notPassed")}
            </p>
          )}
          {exam && (
            <p className="mt-2 text-sm text-muted">
              {t("rule", { overall: Math.round(rule.overall * 100), min: Math.round(rule.minPerSkill * 100) })}
            </p>
          )}
        </div>
      </div>

      <section aria-labelledby="skills" className="rounded-card border border-line bg-surface p-5">
        <h2 id="skills" className="font-bold">{t("bySkill")}</h2>
        <ul className="mt-3 flex flex-col gap-3">
          {SKILLS.filter((s) => attempt.perSkill?.[s] !== undefined).map((s) => {
            const v = Math.round((attempt.perSkill![s] ?? 0) * 100);
            const low = exam && v < rule.minPerSkill * 100;
            return (
              <li key={s}>
                <div className="flex justify-between text-sm">
                  <span>{ta(`skills.${s}`)}</span>
                  <span className={low ? "font-bold" : ""}>{kids ? "★".repeat(stars(v / 100)) || "—" : `${v}%`}</span>
                </div>
                <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-bg" role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={ta(`skills.${s}`)}>
                  <div className={`h-full rounded-full ${low ? "bg-cyan" : "bg-accent"}`} style={{ width: `${Math.max(v, 2)}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {toWorkOn.length > 0 && (
        <section aria-labelledby="next" className="rounded-card bg-lime-pale p-5 text-navy">
          <h2 id="next" className="font-bold">{t("toWorkOn")}</h2>
          <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm">
            {toWorkOn.slice(0, 8).map((x, i) => <li key={i}>{x}</li>)}
          </ul>
        </section>
      )}

      {exam && attempt.feedback?.productive && Object.keys(attempt.feedback.productive).length > 0 && (
        <section aria-labelledby="examiner" className="rounded-card border border-line p-5">
          <h2 id="examiner" className="font-bold">{t("examiner")}</h2>
          {Object.entries(attempt.feedback.productive).map(([itemId, p]) => (
            <div key={itemId} className="mt-3 text-sm">
              <p className="font-semibold">{ta(`skills.${itemId.startsWith("w") ? "writing" : "speaking"}`)}</p>
              <p className="mt-1 italic text-muted">“{p.response}”</p>
              <p className="mt-1">{p.feedback}</p>
            </div>
          ))}
        </section>
      )}

      <div className="mt-auto grid gap-3 pt-2 sm:grid-cols-2">
        {exam && attempt.passed ? (
          <>
            <p className="rounded-xl border border-dashed border-link p-3 text-sm sm:col-span-2">{t("nextLevelSoon")}</p>
            <Link href="/home" className="flex min-h-tap items-center justify-center rounded-xl bg-accent font-bold text-on-accent sm:col-span-2">
              {t("startNextLevel")}
            </Link>
          </>
        ) : (
          <>
            <Link href={exam ? "/session" : "/practice/review"} className="flex min-h-tap items-center justify-center rounded-xl bg-accent font-bold text-on-accent">
              {exam ? t("practiseMore") : t("reviewWords")}
            </Link>
            <Link href="/practice" className="flex min-h-tap items-center justify-center rounded-xl border border-line font-semibold hover:border-link">
              {t("backToPractice")}
            </Link>
          </>
        )}
      </div>
    </main>
  );
}

function ScoreRing({ percent, label }: { percent: number; label: string }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 120 120" className="size-32 shrink-0" role="img" aria-label={`${label}: ${percent}%`}>
      <circle cx="60" cy="60" r={r} fill="none" stroke="var(--surface)" strokeWidth="12" />
      <circle
        cx="60" cy="60" r={r} fill="none" stroke="var(--accent)" strokeWidth="12" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - percent / 100)} transform="rotate(-90 60 60)"
      />
      <text x="60" y="68" textAnchor="middle" className="font-display" fontSize="28" fill="var(--fg)">{percent}%</text>
    </svg>
  );
}
