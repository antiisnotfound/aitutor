import { getTranslations } from "next-intl/server";
import { CEFR_LEVELS, UNLOCKED_LEVELS } from "@/config/learning";
import { initLocale } from "@/i18n/locale";
import { candosFor, levelProgress } from "@/lib/learning/progress";
import { getCurrentUser, getSkillMap } from "@/lib/user";

export default async function ProgressPage({ params }: PageProps<"/[locale]/progress">) {
  const locale = await initLocale(params);
  const [t, user] = await Promise.all([getTranslations("progress"), getCurrentUser()]);
  const learner = user?.learner;
  if (!learner) return null;

  const map = await getSkillMap(learner.id);
  const lp = levelProgress(learner.level, map);
  const statusOf = (id: string) => map[id] ?? "not_seen";

  return (
    <>
      <h1 className="font-display text-3xl">{t("title")}</h1>

      <section aria-labelledby="ladder" className="mt-6">
        <h2 id="ladder" className="text-sm font-medium text-muted">{t("ladder")}</h2>
        <ol className="mt-2 grid grid-cols-6 gap-2">
          {CEFR_LEVELS.filter((l) => l !== "A0").map((l) => {
            const locked = !UNLOCKED_LEVELS.includes(l);
            const current = l === lp.target;
            return (
              <li
                key={l}
                aria-current={current ? "step" : undefined}
                className={`flex min-h-tap flex-col items-center justify-center rounded-xl border text-sm font-bold ${
                  current ? "border-accent bg-accent text-on-accent" : "border-line"
                } ${locked ? "opacity-50" : ""}`}
              >
                {l}
                {locked && <span className="sr-only"> ({t("locked")})</span>}
                {locked && <span aria-hidden="true" className="text-xs">🔒</span>}
              </li>
            );
          })}
        </ol>
      </section>

      <section aria-labelledby="candos" className="mt-6 rounded-card border border-line bg-surface p-5">
        <h2 id="candos" className="font-bold">{t("canDoTitle", { level: lp.target ?? "" })}</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {candosFor(learner.level).map((c) => {
            const s = statusOf(c.id);
            return (
              <li key={c.id} className="flex items-center justify-between gap-3 text-sm">
                <span>{c.label[locale]}</span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                    s === "mastered" ? "bg-accent text-on-accent" : s === "practising" ? "bg-surface-2" : "border border-line text-muted"
                  }`}
                >
                  {t(`status.${s}`)}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-xs text-muted">{t("source")}</p>
      </section>
    </>
  );
}
