import { getTranslations } from "next-intl/server";
import { ASSESSMENT } from "@/config/app";
import { initLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { assessmentStatus } from "@/lib/assessment/status";
import { getStore } from "@/lib/data/store";
import { getCurrentUser } from "@/lib/user";

export default async function PracticePage({ params }: PageProps<"/[locale]/practice">) {
  await initLocale(params);
  const [t, user] = await Promise.all([getTranslations("practice"), getCurrentUser()]);
  const learner = user?.learner;
  if (!learner) return null;
  const [vocab, status] = await Promise.all([(await getStore()).vocabularyStats(learner.id), assessmentStatus(learner)]);
  const { checkin, levelUp } = status;
  const pct = (v: number | null) => (v === null ? "" : `${Math.round(v * 100)}%`);

  return (
    <>
      <h1 className="font-display text-3xl">{t("title")}</h1>
      <div className="mt-6 flex flex-col gap-4">
        <Tile
          href="/practice/review"
          title={t("review.title")}
          body={vocab.total === 0 ? t("review.empty") : t("review.status", { due: vocab.due, total: vocab.total })}
          cta={vocab.due > 0 ? t("review.cta") : t("review.ctaAnyway")}
          highlight={vocab.due > 0}
        />
        <Tile
          href="/practice/checkin"
          title={t("checkin.title")}
          body={[
            checkin.due ? t("checkin.due") : t("checkin.dueIn", { days: checkin.dueInDays }),
            checkin.lastScore !== null ? t("checkin.last", { score: pct(checkin.lastScore) }) : t("checkin.about", { count: ASSESSMENT.checkInQuestions }),
          ].join(" · ")}
          cta={checkin.due ? t("checkin.cta") : t("checkin.ctaEarly")}
          highlight={checkin.due}
          secondary={checkin.lastId ? { href: `/practice/results/${checkin.lastId}`, label: t("seeResults") } : undefined}
        />
        <Tile
          href={levelUp.state === "available" ? "/practice/exam" : undefined}
          title={t("exam.title")}
          body={
            levelUp.state === "locked"
              ? t("exam.locked", { percent: Math.round(levelUp.progressNeeded * 100) })
              : levelUp.state === "cooldown"
                ? t("exam.cooldown", { days: levelUp.availableInDays })
                : levelUp.state === "passed"
                  ? t("exam.passed")
                  : t("exam.available")
          }
          cta={levelUp.state === "available" ? t("exam.cta") : undefined}
          highlight={levelUp.state === "available"}
          secondary={"lastId" in levelUp && levelUp.lastId ? { href: `/practice/results/${levelUp.lastId}`, label: t("seeResults") } : undefined}
        />
      </div>
    </>
  );
}

function Tile({
  href, title, body, cta, highlight, secondary,
}: {
  href?: string; title: string; body: string; cta?: string; highlight?: boolean; secondary?: { href: string; label: string };
}) {
  return (
    <section className={`rounded-card border p-5 ${highlight ? "border-accent bg-surface" : "border-line"}`}>
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="mt-1 text-sm text-muted">{body}</p>
      {(cta || secondary) && (
        <div className="mt-4 flex flex-wrap gap-3">
          {href && cta && (
            <Link href={href} className={`flex min-h-tap items-center rounded-xl px-5 font-bold ${highlight ? "bg-accent text-on-accent" : "border border-line"}`}>
              {cta}
            </Link>
          )}
          {secondary && (
            <Link href={secondary.href} className="flex min-h-tap items-center px-1 text-sm font-semibold text-link underline underline-offset-4">
              {secondary.label}
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
