import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { TUTORS } from "@/config/learning";
import { initLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { getStore } from "@/lib/data/store";
import { streakDays } from "@/lib/learning/streak";
import { getCurrentUser } from "@/lib/user";

export async function generateMetadata({ params }: PageProps<"/[locale]/session/[id]/summary">): Promise<Metadata> {
  const locale = await initLocale(params);
  const t = await getTranslations({ locale, namespace: "summary" });
  return { title: t("metaTitle") };
}

export default async function SummaryPage({ params }: PageProps<"/[locale]/session/[id]/summary">) {
  await initLocale(params);
  const { id } = await params;
  const [t, user] = await Promise.all([getTranslations("summary"), getCurrentUser()]);
  const learner = user?.learner;
  if (!user || !learner) return null;

  const store = await getStore();
  const session = await store.getSession(id, user.id);
  if (!session || session.status !== "completed") notFound();

  const streak = streakDays(await store.completedSessionTimes(learner.id, 60));
  const minutes = Math.max(1, Math.round((session.durationSeconds ?? 0) / 60));
  const s = session.summary;
  const tutor = TUTORS[learner.targetLanguage][learner.tutorGender];

  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-4 py-8 md:max-w-2xl">
      <h1 className="font-display text-3xl">{t("title")}</h1>
      {session.mode === "placement" && <p className="text-muted">{t("placementDone", { name: tutor })}</p>}

      <dl className="grid grid-cols-3 gap-3 text-center">
        {[
          [t("minutesLabel"), minutes],
          [t("wordsLabel"), s?.newWords.length ?? 0],
          [t("streakLabel"), streak],
        ].map(([label, value]) => (
          <div key={label} className="rounded-card border border-line bg-surface p-3">
            <dd className="font-display text-3xl text-link">{value}</dd>
            <dt className="text-xs text-muted">{label}</dt>
          </div>
        ))}
      </dl>

      {!s ? (
        <p className="rounded-card border border-line p-4 text-sm">{t("noSummary")}</p>
      ) : (
        <>
          {s.learned.length > 0 && (
            <section aria-labelledby="learned" className="rounded-card border border-line bg-surface p-5">
              <h2 id="learned" className="font-bold">{t("learned")}</h2>
              <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm">
                {s.learned.map((x, i) => <li key={i}>{x}</li>)}
              </ul>
            </section>
          )}

          {s.keepInMind.length > 0 && (
            <section aria-labelledby="keep" className="rounded-card bg-lime-pale p-5 text-navy">
              <h2 id="keep" className="font-bold">{t("keepInMind")}</h2>
              <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm">
                {s.keepInMind.map((x, i) => <li key={i}>{x}</li>)}
              </ul>
            </section>
          )}

          {s.newWords.length > 0 && (
            <section aria-labelledby="words">
              <div className="flex items-baseline justify-between">
                <h2 id="words" className="font-bold">{t("newWords")}</h2>
                <span className="text-xs text-muted">{t("addedToReview")}</span>
              </div>
              <ul className="mt-2 grid grid-cols-2 gap-2">
                {s.newWords.map((w, i) => (
                  <li key={i} className="rounded-xl border border-line bg-surface p-3">
                    <span lang={learner.targetLanguage} className="block font-semibold">{w.term}</span>
                    <span className="block text-xs text-muted">{w.translation}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <div className="mt-auto grid gap-3 pt-4 sm:grid-cols-2">
        <Link href="/practice" className="flex min-h-tap items-center justify-center rounded-xl bg-accent font-bold text-on-accent">
          {t("reviewNow")}
        </Link>
        <Link href="/home" className="flex min-h-tap items-center justify-center rounded-xl border border-line font-semibold hover:border-link">
          {t("backHome")}
        </Link>
      </div>
    </main>
  );
}
