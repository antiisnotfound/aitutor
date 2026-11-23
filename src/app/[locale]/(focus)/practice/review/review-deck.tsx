"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { SpeakButton } from "@/components/speech/speak-button";
import type { TargetLanguage } from "@/config/app";
import { Link } from "@/i18n/navigation";
import type { ReviewGrade } from "@/lib/learning/srs";
import { gradeCard } from "./actions";

type Card = { id: string; term: string; translation: string; note: string | null; kind: "word" | "phrase" };

const GRADES: { grade: ReviewGrade; tone: string }[] = [
  { grade: "again", tone: "border-red-400" },
  { grade: "hard", tone: "border-line" },
  { grade: "good", tone: "border-line" },
  { grade: "easy", tone: "border-accent" },
];

/** Flashcards: recall the meaning, reveal, rate how well you knew it. */
export function ReviewDeck({ target, cards, upcoming }: { target: TargetLanguage; cards: Card[]; upcoming: boolean }) {
  const t = useTranslations("review");
  const [queue, setQueue] = useState(cards);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(0);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(false);

  const card = queue[0];

  function rate(grade: ReviewGrade) {
    if (!card) return;
    setError(false);
    startTransition(async () => {
      const res = await gradeCard({ id: card.id, grade });
      if (!res.ok) return setError(true);
      setRevealed(false);
      setDone((d) => d + 1);
      setQueue((q) => {
        const [first, ...rest] = q;
        return res.requeue ? [...rest, first] : rest;
      });
    });
  }

  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 py-6">
      <div className="flex min-h-tap items-center justify-between">
        <Link href="/practice" className="font-semibold text-link">← {t("back")}</Link>
        {card && <span className="text-sm text-muted">{t("left", { count: queue.length })}</span>}
      </div>
      <h1 className="mt-4 font-display text-3xl">{t("title")}</h1>

      {!card ? (
        <section className="mt-10 flex flex-col items-center gap-4 text-center">
          <p className="text-5xl" aria-hidden="true">✨</p>
          <h2 className="text-xl font-bold">{done ? t("finished", { count: done }) : t("nothingDue")}</h2>
          <p className="text-muted">{done ? t("finishedBody") : t("nothingDueBody")}</p>
          <div className="mt-4 grid w-full gap-3">
            {!upcoming && (
              <Link href="/practice/review?more=1" className="flex min-h-tap items-center justify-center rounded-xl border border-line font-semibold hover:border-link">
                {t("practiceAnyway")}
              </Link>
            )}
            <Link href="/practice" className="flex min-h-tap items-center justify-center rounded-xl bg-accent font-bold text-on-accent">
              {t("back")}
            </Link>
          </div>
        </section>
      ) : (
        <>
          <section
            aria-live="polite"
            className="mt-6 flex min-h-64 flex-col items-center justify-center gap-4 rounded-card border border-line bg-surface p-6 text-center"
          >
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">
              {card.kind === "phrase" ? t("phrase") : t("word")}
            </span>
            <div className="flex items-center gap-3">
              <p lang={target} className="font-display text-3xl">{card.term}</p>
              <SpeakButton text={card.term} lang={target} label={t("listen")} />
            </div>
            {revealed ? (
              <div>
                <p className="text-xl font-semibold">{card.translation}</p>
                {card.note && <p className="mt-2 text-sm text-muted">{card.note}</p>}
              </div>
            ) : (
              <p className="text-sm text-muted">{t("recall")}</p>
            )}
          </section>

          <div className="mt-auto pt-6">
            {error && <p role="alert" className="mb-3 text-sm text-red-300">{t("error")}</p>}
            {!revealed ? (
              <button
                type="button"
                onClick={() => setRevealed(true)}
                className="min-h-tap w-full rounded-xl bg-accent font-bold text-on-accent"
              >
                {t("show")}
              </button>
            ) : (
              <div role="group" aria-label={t("howWell")} className="grid grid-cols-4 gap-2">
                {GRADES.map(({ grade, tone }) => (
                  <button
                    key={grade}
                    type="button"
                    disabled={pending}
                    onClick={() => rate(grade)}
                    className={`min-h-tap rounded-xl border px-1 text-sm font-semibold disabled:opacity-50 ${tone}`}
                  >
                    {t(`grades.${grade}`)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}
