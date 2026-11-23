"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { speak } from "@/components/speech/speak-button";
import { ASSESSMENT, type TargetLanguage } from "@/config/app";
import { Link, useRouter } from "@/i18n/navigation";
import type { ChoiceItem, OrderItem, Response, Section } from "@/lib/assessment/types";
import { SpeakingRecorder } from "./speaking-recorder";

type Kind = "checkin" | "levelup";
const MAX_PLAYS = 2; // exam listening: like the big exams, two plays

/** Runs a check-in quiz or the level-up exam, one part per screen. */
export function AssessmentRunner({ kind, target }: { kind: Kind; target: TargetLanguage }) {
  const t = useTranslations("assessment");
  const router = useRouter();
  const [phase, setPhase] = useState<"intro" | "loading" | "running" | "submitting" | "error">("intro");
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [index, setIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, Response>>({});
  const [typedSpeaking, setTypedSpeaking] = useState<Record<string, string | null>>({});
  const [spoken, setSpoken] = useState<Record<string, string>>({});
  const [plays, setPlays] = useState<Record<string, number>>({});
  const [confirming, setConfirming] = useState(false);

  async function begin() {
    setPhase("loading");
    try {
      const res = await fetch("/api/assessment/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { attemptId: string; sections: Section[] };
      setAttemptId(data.attemptId);
      setSections(data.sections);
      setPhase("running");
    } catch {
      setPhase("error");
    }
  }

  const items = sections.flatMap((s) => s.items);
  const answered = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (item?.type === "speaking") return Boolean(spoken[id]?.trim() || typedSpeaking[id]?.trim());
    const r = responses[id];
    if (!r) return false;
    if (r.type === "text") return r.value.trim().length > 0;
    if (r.type === "order") return r.value.length === (item as OrderItem).chunks.length;
    return true;
  };
  const unanswered = items.filter((i) => !answered(i.id)).length;

  async function submit() {
    if (!attemptId) return;
    setPhase("submitting");
    const payload: Record<string, Response> = { ...responses };
    for (const [id, text] of Object.entries(typedSpeaking)) if (text !== null) payload[id] = { type: "text", value: text, typed: true };
    try {
      const res = await fetch(`/api/assessment/${attemptId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responses: payload }),
      });
      if (!res.ok) throw new Error();
      router.replace(`/practice/results/${attemptId}`);
    } catch {
      setPhase("error");
    }
  }

  // ------------------------------------------------------------ intro
  if (phase === "intro" || phase === "loading" || (phase === "error" && !attemptId)) {
    return (
      <main id="main" className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 py-6">
        <Link href="/practice" className="flex min-h-tap w-fit items-center font-semibold text-link">← {t("back")}</Link>
        <h1 className="mt-4 font-display text-3xl">{t(`${kind}.title`)}</h1>
        <p className="mt-3 text-muted">{t(`${kind}.intro`)}</p>
        {kind === "levelup" && (
          <ul className="mt-6 flex flex-col gap-2 text-sm">
            {(["reading", "listening", "writing", "speaking"] as const).map((s) => (
              <li key={s} className="rounded-xl border border-line px-4 py-3">
                <span className="font-semibold">{t(`skills.${s}`)}</span> — {t(`levelup.parts.${s}`)}
              </li>
            ))}
            <li className="mt-2 text-muted">
              {t("levelup.passRule", {
                overall: Math.round(ASSESSMENT.levelUpPass.overall * 100),
                min: Math.round(ASSESSMENT.levelUpPass.minPerSkill * 100),
              })}
            </li>
          </ul>
        )}
        <div className="mt-auto pt-8" aria-live="polite">
          {phase === "error" && <p role="alert" className="mb-3 rounded-xl bg-red-950/60 p-3 text-sm text-red-100">{t("errors.start")}</p>}
          <button type="button" onClick={begin} disabled={phase === "loading"} className="min-h-tap w-full rounded-xl bg-accent font-bold text-on-accent disabled:opacity-60">
            {phase === "loading" ? t("preparing") : t("start")}
          </button>
        </div>
      </main>
    );
  }

  // ------------------------------------------------------------ running
  const section = sections[index];
  const last = index === sections.length - 1;
  const setResponse = (id: string, r: Response) => setResponses((cur) => ({ ...cur, [id]: r }));

  const play = (key: string, text: string, limited: boolean) => {
    if (limited && (plays[key] ?? 0) >= MAX_PLAYS) return;
    speak(text, target, 0.85);
    setPlays((p) => ({ ...p, [key]: (p[key] ?? 0) + 1 }));
  };

  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 py-6 md:max-w-2xl">
      <div className="flex min-h-tap items-center justify-between text-sm">
        <span className="font-semibold">{t(`skills.${section.skill}`)}</span>
        <span className="text-muted">{t("partOf", { current: index + 1, total: sections.length })}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface" aria-hidden="true">
        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${((index + 1) / sections.length) * 100}%` }} />
      </div>

      <h1 className="mt-5 text-lg font-bold">{t(`instructions.${kind}.${section.skill}`)}</h1>

      {section.passage && !section.passage.audio && (
        <blockquote lang={section.passage.lang} className="mt-4 rounded-card border border-line bg-surface p-4 leading-relaxed">
          {section.passage.text}
        </blockquote>
      )}
      {section.passage?.audio && (
        <div className="mt-4 flex items-center gap-3 rounded-card border border-line bg-surface p-4">
          <button
            type="button"
            onClick={() => play(section.id, section.passage!.text, kind === "levelup")}
            disabled={kind === "levelup" && (plays[section.id] ?? 0) >= MAX_PLAYS}
            className="min-h-tap rounded-full bg-accent px-5 font-bold text-on-accent disabled:opacity-50"
          >
            ▶ {t("play")}
          </button>
          {kind === "levelup" && <span className="text-sm text-muted">{t("playsLeft", { count: MAX_PLAYS - (plays[section.id] ?? 0) })}</span>}
        </div>
      )}

      <ol className="mt-5 flex flex-col gap-6">
        {section.items.map((item, n) => (
          <li key={item.id}>
            {item.type === "choice" && (
              <ChoiceQuestion
                item={item}
                number={n + 1}
                value={responses[item.id]?.type === "choice" ? (responses[item.id] as { value: number }).value : -1}
                onChange={(v) => setResponse(item.id, { type: "choice", value: v })}
                onPlay={item.audio ? () => play(item.id, item.audio!, false) : undefined}
                playLabel={t("play")}
              />
            )}
            {item.type === "order" && (
              <OrderQuestion
                item={item}
                value={responses[item.id]?.type === "order" ? (responses[item.id] as { value: string[] }).value : []}
                onChange={(v) => setResponse(item.id, { type: "order", value: v })}
                resetLabel={t("reset")}
                meansLabel={t("means")}
              />
            )}
            {item.type === "writing" && (
              <WritingQuestion
                prompt={item.prompt}
                min={item.minWords}
                max={item.maxWords}
                lang={target}
                value={responses[item.id]?.type === "text" ? (responses[item.id] as { value: string }).value : ""}
                onChange={(v) => setResponse(item.id, { type: "text", value: v })}
                countLabel={(c) => t("words", { count: c, min: item.minWords, max: item.maxWords })}
              />
            )}
            {item.type === "speaking" && attemptId && (
              <div className="flex flex-col gap-3">
                <p className="font-semibold">{n + 1}. {item.prompt}</p>
                <SpeakingRecorder
                  attemptId={attemptId}
                  itemId={item.id}
                  suggestedSeconds={item.seconds}
                  typed={typedSpeaking[item.id] ?? null}
                  onTyped={(v) => setTypedSpeaking((cur) => ({ ...cur, [item.id]: v }))}
                  onTranscript={(text) => setSpoken((cur) => ({ ...cur, [item.id]: text }))}
                />
              </div>
            )}
          </li>
        ))}
      </ol>

      <div className="sticky bottom-0 mt-8 flex gap-3 bg-bg pb-4 pt-2" aria-live="polite">
        {phase === "error" && <p role="alert" className="absolute -top-10 text-sm text-red-300">{t("errors.submit")}</p>}
        {index > 0 && (
          <button type="button" onClick={() => setIndex(index - 1)} className="min-h-tap flex-1 rounded-xl border border-line font-semibold">
            {t("previous")}
          </button>
        )}
        {!last ? (
          <button type="button" onClick={() => { setIndex(index + 1); window.scrollTo({ top: 0 }); }} className="min-h-tap flex-[2] rounded-xl bg-accent font-bold text-on-accent">
            {t("next")}
          </button>
        ) : (
          <button
            type="button"
            disabled={phase === "submitting"}
            onClick={() => (unanswered > 0 && !confirming ? setConfirming(true) : void submit())}
            className="min-h-tap flex-[2] rounded-xl bg-accent font-bold text-on-accent disabled:opacity-60"
          >
            {phase === "submitting" ? t("grading") : confirming ? t("submitAnyway", { count: unanswered }) : t("submit")}
          </button>
        )}
      </div>
    </main>
  );
}

// ------------------------------------------------------------------------

function ChoiceQuestion({
  item, number, value, onChange, onPlay, playLabel,
}: {
  item: ChoiceItem; number: number; value: number; onChange: (v: number) => void; onPlay?: () => void; playLabel: string;
}) {
  return (
    <fieldset>
      <legend className="mb-2 flex items-center gap-3 font-semibold">
        <span>{number}.</span>
        {onPlay && (
          <button type="button" onClick={onPlay} className="min-h-tap rounded-full border border-line px-4 text-sm text-link hover:border-link">
            ▶ {playLabel}
          </button>
        )}
        {item.prompt && <span lang={item.promptLang}>{item.prompt}</span>}
      </legend>
      <div className="grid gap-2">
        {item.options.map((o, i) => (
          <label
            key={i}
            lang={item.optionsLang}
            className={`flex min-h-tap cursor-pointer items-center gap-3 rounded-xl border px-4 has-focus-visible:outline-3 has-focus-visible:outline-link ${
              value === i ? "border-accent bg-surface" : "border-line"
            }`}
          >
            <input type="radio" name={item.id} checked={value === i} onChange={() => onChange(i)} className="size-4 accent-lime" />
            {o}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function OrderQuestion({
  item, value, onChange, resetLabel, meansLabel,
}: {
  item: OrderItem; value: string[]; onChange: (v: string[]) => void; resetLabel: string; meansLabel: string;
}) {
  // Indices of chunks already used (chunks can repeat, so track by index).
  const [used, setUsed] = useState<number[]>([]);
  const add = (i: number) => {
    const next = [...used, i];
    setUsed(next);
    onChange(next.map((n) => item.chunks[n]));
  };
  const reset = () => {
    setUsed([]);
    onChange([]);
  };
  return (
    <div>
      {item.translation && <p className="mb-2 text-sm text-muted">{meansLabel}: “{item.translation}”</p>}
      <div lang={item.lang} aria-live="polite" className="flex min-h-14 flex-wrap items-center gap-2 rounded-xl border-2 border-dashed border-line p-2">
        {value.map((c, i) => (
          <span key={i} className="rounded-full bg-accent px-3 py-1.5 font-semibold text-on-accent">{c}</span>
        ))}
      </div>
      <div lang={item.lang} className="mt-3 flex flex-wrap gap-2">
        {item.chunks.map((c, i) => (
          <button
            key={i}
            type="button"
            disabled={used.includes(i)}
            onClick={() => add(i)}
            className="min-h-tap rounded-full border-2 border-teal px-4 font-semibold disabled:opacity-30"
          >
            {c}
          </button>
        ))}
        {value.length > 0 && (
          <button type="button" onClick={reset} className="min-h-tap px-2 text-sm font-semibold text-link underline underline-offset-4">
            {resetLabel}
          </button>
        )}
      </div>
    </div>
  );
}

function WritingQuestion({
  prompt, min, max, lang, value, onChange, countLabel,
}: {
  prompt: string; min: number; max: number; lang: string; value: string; onChange: (v: string) => void; countLabel: (n: number) => string;
}) {
  const count = value.trim() ? value.trim().split(/\s+/).length : 0;
  const ok = count >= min && count <= max;
  return (
    <div className="flex flex-col gap-2">
      <p id="writing-prompt" className="font-semibold">{prompt}</p>
      <textarea
        aria-labelledby="writing-prompt"
        lang={lang}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
        aria-describedby="word-count"
        className="rounded-xl border border-line bg-surface p-3 text-fg"
      />
      <p id="word-count" className={`text-sm ${ok ? "text-link" : "text-muted"}`}>{countLabel(count)}</p>
    </div>
  );
}
