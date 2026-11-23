import { cookies } from "next/headers";
import { getFormatter, getTranslations } from "next-intl/server";
import { ASSESSMENT, SESSION } from "@/config/app";
import { TUTORS } from "@/config/learning";
import { initLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { estimateToNextLevel } from "@/lib/learning/estimate";
import { getStore } from "@/lib/data/store";
import { levelProgress } from "@/lib/learning/progress";
import { streakDays } from "@/lib/learning/streak";
import { THEME_COOKIE, themeFor } from "@/lib/theme";
import { getCurrentUser, getSkillMap } from "@/lib/user";

export default async function HomePage({ params }: PageProps<"/[locale]/home">) {
  const locale = await initLocale(params);
  const [t, tc, user] = await Promise.all([
    getTranslations("home"),
    getTranslations("common"),
    getCurrentUser(),
  ]);
  const learner = user?.learner;
  if (!user || !learner) return null; // layout redirects

  const kids = themeFor(user.ageGroup, (await cookies()).get(THEME_COOKIE)?.value) === "kids";
  const map = await getSkillMap(learner.id);
  const lp = levelProgress(learner.level, map);
  const percent = Math.round(lp.progress * 100);
  const estimate = estimateToNextLevel({
    level: learner.level,
    progress: lp.progress,
    dailyMinutes: learner.dailyMinutes,
    native: user.nativeLanguage,
    target: learner.targetLanguage,
  });
  const tutorName = TUTORS[learner.targetLanguage][learner.tutorGender];
  const firstName = user.displayName?.split(" ")[0];

  const store = await getStore();
  const [times, vocab, [lastSession]] = await Promise.all([
    store.completedSessionTimes(learner.id, 60),
    store.vocabularyStats(learner.id),
    store.recentSessions(learner.id, 1),
  ]);
  const streak = streakDays(times);
  const format = await getFormatter();

  const stars = Math.round(lp.progress * 5);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-start justify-between gap-3">
        <h1 className="font-display text-3xl">{firstName ? t("greeting", { name: firstName }) : t("greetingNoName")}</h1>
        <p className="flex shrink-0 items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-sm font-bold">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-link" aria-hidden="true">
            <path d="M12 2s5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 1-3.5S9 11 10.5 11C10.5 7 12 2 12 2z" />
          </svg>
          <span className="sr-only">{t("streakLabel")}: </span>
          {t("streak", { count: streak })}
        </p>
      </header>

      {/* Level card */}
      <section aria-labelledby="level-title" className="rounded-card border border-line bg-surface p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="level-title" className="text-lg font-bold">
            {t("towards", { level: lp.target ?? learner.level })}
          </h2>
          {kids ? (
            <span className="text-xl tracking-widest text-teal-dark" aria-label={t("stars", { count: stars, total: 5 })}>
              {"★".repeat(stars)}
              <span className="opacity-30">{"★".repeat(5 - stars)}</span>
            </span>
          ) : (
            <span className="font-display text-2xl text-link">{percent}%</span>
          )}
        </div>
        {!kids && (
          <div
            className="mt-3 h-2.5 overflow-hidden rounded-full bg-bg"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-labelledby="level-title"
          >
            <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(percent, 2)}%` }} />
          </div>
        )}
        {estimate && (
          <p className="mt-3 text-sm text-muted">
            {tc(`estimate.${estimate.friendly.unit}`, {
              count: estimate.friendly.count,
              minutes: learner.dailyMinutes,
              level: estimate.next,
            })}
          </p>
        )}
        {lp.upNext.length > 0 && (
          <>
            <h3 className="mt-4 text-sm font-medium text-muted">{t("upNext")}</h3>
            <ul className="mt-2 flex flex-wrap gap-2">
              {lp.upNext.slice(0, 3).map((c) => (
                <li key={c.id} className="rounded-full border border-line px-3 py-1 text-sm">
                  {c.label[locale]}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* Talk card */}
      <Link
        href="/session"
        className="group flex items-center gap-4 rounded-card bg-accent p-5 text-on-accent"
      >
        <span aria-hidden="true" className="grid size-16 shrink-0 place-items-center rounded-full bg-navy font-display text-2xl text-lime">
          {tutorName[0]}
        </span>
        <span className="flex-1">
          <span className="block text-xl font-bold">
            {kids ? t("talkKids") : t("talk", { name: tutorName })}
          </span>
          <span className="block text-sm">
            {!learner.placementDone ? t("placement") : t("talkMinutes", { minutes: SESSION.defaultMinutes })}
          </span>
        </span>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3ZM5 11a7 7 0 0 0 14 0M12 18v3" strokeLinecap="round" />
        </svg>
      </Link>

      {/* Tiles */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/practice" className="rounded-card border border-line bg-surface p-4 hover:border-link">
          <span className="block font-bold">{t("wordReview")}</span>
          <span className="mt-1 block text-sm text-muted">
            {vocab.total === 0 ? t("wordsNone") : t("wordsDue", { due: vocab.due, total: vocab.total })}
          </span>
        </Link>
        <Link href="/practice" className="rounded-card border border-line bg-surface p-4 hover:border-link">
          <span className="block font-bold">{t("checkIn")}</span>
          <span className="mt-1 block text-sm text-muted">{t("checkInEvery", { days: ASSESSMENT.checkInEveryDays })}</span>
        </Link>
      </div>

      {/* Last session recap */}
      <section aria-labelledby="last-title" className="rounded-card border border-line p-5">
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="last-title" className="font-bold">{t("lastSession")}</h2>
          {lastSession && (
            <span className="text-xs text-muted">{format.relativeTime(new Date(lastSession.startedAt))}</span>
          )}
        </div>
        {lastSession?.summary ? (
          <>
            <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm">
              {lastSession.summary.learned.slice(0, 2).map((x, i) => <li key={i}>{x}</li>)}
            </ul>
            <Link href={`/session/${lastSession.id}/summary`} className="mt-2 inline-block text-sm font-semibold text-link underline underline-offset-4">
              {t("seeSummary")}
            </Link>
          </>
        ) : (
          <p className="mt-1 text-sm text-muted">{t("lastSessionEmpty")}</p>
        )}
      </section>
    </div>
  );
}
