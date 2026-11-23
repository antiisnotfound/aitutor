"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { SESSION } from "@/config/app";
import { pictureFor } from "@/content/objects";
import { TutorAvatar, TutorPortrait } from "@/components/tutor/tutor-avatar";
import { avatarUrl, type AvatarConfig } from "@/config/avatars";
import { Link, useRouter } from "@/i18n/navigation";
import { createTransport, type RealtimeTransport, type TransportEvent } from "@/lib/ai/client";
import {
  emptyUsage,
  type CorrectionEvent,
  type SessionEvent,
  type ShowEvent,
  type StartSessionResponse,
  type TranscriptTurn,
} from "@/lib/session/types";

type Phase = "lobby" | "connecting" | "live" | "ending" | "error";
type ErrorKey = "micDenied" | "startFailed" | "connectionLost" | "endFailed";

const WRAP_UP_NOTE =
  "Only about one minute is left. Wrap up warmly in one or two sentences and say goodbye.";

const mmss = (s: number) =>
  `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, "0")}`;

export function LiveSession(props: {
  tutorName: string;
  avatar: AvatarConfig;
  target: string;
  level: string;
  placement: boolean;
  nativeName: string;
  learnerInitial: string;
  kids: boolean;
  demo: boolean;
}) {
  const { tutorName, avatar, target, level, placement, nativeName, learnerInitial, kids, demo } = props;
  const t = useTranslations("live");
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("lobby");
  const [error, setError] = useState<ErrorKey | null>(null);
  const [planned, setPlanned] = useState<number | null>(SESSION.defaultMinutes);
  const [turns, setTurns] = useState<TranscriptTurn[]>([]);
  const [show, setShow] = useState<ShowEvent | null>(null);
  const [correction, setCorrection] = useState<CorrectionEvent | null>(null);
  const [tutorSpeaking, setTutorSpeaking] = useState(false);
  const [talking, setTalking] = useState(false);
  const [bridge, setBridge] = useState(false);
  const [captions, setCaptions] = useState(true);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState("");
  const [elapsed, setElapsed] = useState(0);

  const transport = useRef<RealtimeTransport | null>(null);
  const session = useRef<StartSessionResponse | null>(null);
  const startedAt = useRef(0);
  const events = useRef<SessionEvent[]>([]);
  const usage = useRef(emptyUsage());
  const turnsRef = useRef<TranscriptTurn[]>([]);
  const nudged = useRef(false);
  const ended = useRef(false);
  const pressStart = useRef(0);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tutorBars = useRef<HTMLDivElement>(null);
  const learnerBars = useRef<HTMLDivElement>(null);
  const [liveTransport, setLiveTransport] = useState<RealtimeTransport | null>(null);

  useEffect(() => {
    turnsRef.current = turns;
  }, [turns]);

  const now = () => Date.now() - startedAt.current;

  const upsertTurn = useCallback((id: string, patch: (t: TranscriptTurn | undefined) => TranscriptTurn | null) => {
    setTurns((cur) => {
      const i = cur.findIndex((t) => t.id === id);
      const next = patch(i >= 0 ? cur[i] : undefined);
      if (i < 0) return next ? [...cur, next] : cur;
      const copy = cur.slice();
      if (next) copy[i] = next;
      else copy.splice(i, 1);
      return copy;
    });
  }, []);

  const translate = useCallback(
    async (id: string, text: string) => {
      const s = session.current;
      if (!s || !text) return;
      try {
        const res = await fetch(`/api/session/${s.sessionId}/translate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        const { translation } = (await res.json()) as { translation?: string };
        if (translation) upsertTurn(id, (t) => (t ? { ...t, translation } : null));
      } catch {
        /* captions just stay untranslated */
      }
    },
    [upsertTurn],
  );

  // ---------------------------------------------------------------- end
  const end = useCallback(async () => {
    if (ended.current) return;
    ended.current = true;
    setPhase("ending");
    setTalking(false);
    transport.current?.stop();
    const s = session.current;
    if (!s) return router.push("/home");
    try {
      const res = await fetch(`/api/session/${s.sessionId}/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: turnsRef.current.filter((t) => t.text.trim() && t.text !== "…"),
          events: events.current,
          usage: usage.current,
        }),
      });
      const { status } = (await res.json()) as { status?: string };
      if (!res.ok) throw new Error();
      router.replace(status === "completed" ? `/session/${s.sessionId}/summary` : "/home");
    } catch {
      setError("endFailed");
      setPhase("error");
    }
  }, [router]);

  // ---------------------------------------------------------------- events
  const onEvent = useCallback(
    (e: TransportEvent) => {
      switch (e.type) {
        case "tutor_delta":
          upsertTurn(e.id, (t) => ({ id: e.id, role: "tutor", text: (t?.text ?? "") + e.delta, at: t?.at ?? now() }));
          break;
        case "tutor_done":
          upsertTurn(e.id, (t) => ({ id: e.id, role: "tutor", text: e.text, translation: e.translation ?? t?.translation, at: t?.at ?? now() }));
          if (!e.translation) void translate(e.id, e.text);
          break;
        case "learner_pending":
          upsertTurn(e.id, () => ({ id: e.id, role: "learner", text: "…", bridge: e.bridge, at: now() }));
          break;
        case "learner":
          upsertTurn(e.id, (t) => (e.text ? { id: e.id, role: "learner", text: e.text, bridge: e.bridge, at: t?.at ?? now() } : null));
          break;
        case "tutor_speaking":
          setTutorSpeaking(e.speaking);
          break;
        case "show": {
          const ev: ShowEvent = { type: "show", object: e.object, word: e.word, translation: e.translation, at: now() };
          events.current.push(ev);
          setShow(ev);
          if (showTimer.current) clearTimeout(showTimer.current);
          showTimer.current = setTimeout(() => setShow(null), 9000);
          break;
        }
        case "correction": {
          const ev: CorrectionEvent = { type: "correction", said: e.said, correct: e.correct, rule: e.rule, chunks: e.chunks, at: now() };
          events.current.push(ev);
          setCorrection(ev);
          break;
        }
        case "usage":
          for (const k of Object.keys(usage.current) as (keyof typeof usage.current)[]) usage.current[k] += e.usage[k];
          break;
        case "error":
          if (e.fatal && !ended.current) {
            setError("connectionLost");
            void end();
          }
          break;
      }
    },
    [end, translate, upsertTurn],
  );

  // ---------------------------------------------------------------- start
  async function start() {
    setError(null);
    setPhase("connecting");
    ended.current = false;
    nudged.current = false;
    try {
      const res = await fetch("/api/session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plannedMinutes: planned }),
      });
      if (!res.ok) throw new Error("start");
      const s = (await res.json()) as StartSessionResponse;
      session.current = s;
      const tr = createTransport(s);
      transport.current = tr;
      tr.on(onEvent);
      startedAt.current = Date.now();
      await tr.start();
      setLiveTransport(tr);
      setPhase("live");
    } catch (err) {
      transport.current?.stop();
      const denied = err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "SecurityError");
      setError(denied ? "micDenied" : "startFailed");
      setPhase("error");
    }
  }

  // Warm the HTTP cache with the avatar file while the learner is in the lobby.
  useEffect(() => {
    const url = avatarUrl(avatar);
    if (!url) return;
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.href = url;
    document.head.appendChild(link);
    return () => link.remove();
  }, [avatar]);

  // ---------------------------------------------------------------- timer
  const limit = (planned ?? SESSION.hardCapMinutes) * 60;
  useEffect(() => {
    if (phase !== "live") return;
    const id = setInterval(() => {
      const secs = Math.floor((Date.now() - startedAt.current) / 1000);
      setElapsed(secs);
      if (!nudged.current && limit - secs <= 60) {
        nudged.current = true;
        transport.current?.nudge(WRAP_UP_NOTE);
      }
      if (secs >= limit) void end();
    }, 500);
    return () => clearInterval(id);
  }, [phase, limit, end]);

  // ---------------------------------------------------------------- voice bars
  useEffect(() => {
    if (phase !== "live") return;
    let raf = 0;
    const loop = () => {
      const lv = transport.current?.levels() ?? { tutor: 0, learner: 0 };
      tutorBars.current?.style.setProperty("--lvl", lv.tutor.toFixed(3));
      learnerBars.current?.style.setProperty("--lvl", lv.learner.toFixed(3));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  // Leaving mid-call: stop audio; warn on reload/close.
  useEffect(() => {
    if (phase !== "live") return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [phase]);
  useEffect(() => () => transport.current?.stop(), []);

  // ---------------------------------------------------------------- talking
  const talkStart = () => {
    transport.current?.talkStart();
    setTalking(true);
  };
  const talkEnd = () => {
    transport.current?.talkEnd({ bridge });
    setTalking(false);
    setBridge(false);
  };
  // Hold to talk, or tap once to start and tap again to send.
  const onPress = () => {
    pressStart.current = Date.now();
    if (talking) talkEnd();
    else talkStart();
  };
  const onRelease = () => {
    if (talking && Date.now() - pressStart.current > 350) talkEnd();
  };

  function sendTyped(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    transport.current?.sendText(text, { bridge });
    setDraft("");
    setBridge(false);
  }

  // ======================================================================
  if (phase === "lobby" || phase === "connecting" || phase === "error") {
    return (
      <main id="main" className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 py-6">
        <Link href="/home" className="flex min-h-tap w-fit items-center font-semibold text-link">
          ← {t("backHome")}
        </Link>
        <div className="mt-6 flex flex-col items-center text-center">
          <TutorPortrait name={tutorName} size="lg" />
          <h1 className="mt-6 font-display text-3xl">
            {placement ? t("placementTitle", { name: tutorName }) : t("lobbyTitle", { name: tutorName })}
          </h1>
          <p className="mt-3 text-muted">
            {placement ? t("placementBody", { name: tutorName }) : t("practiceBody", { name: tutorName })}
          </p>
        </div>

        <fieldset className="mt-8">
          <legend className="mb-2 text-sm font-medium text-muted">{t("length")}</legend>
          <div className="flex gap-2">
            {[SESSION.defaultMinutes, null].map((m) => (
              <label
                key={String(m)}
                className={`flex min-h-tap flex-1 cursor-pointer items-center justify-center rounded-xl border px-2 text-sm font-semibold has-focus-visible:outline-3 has-focus-visible:outline-link ${
                  planned === m ? "border-accent bg-accent text-on-accent" : "border-line"
                }`}
              >
                <input type="radio" name="length" className="sr-only" checked={planned === m} onChange={() => setPlanned(m)} />
                {m ? t("lengthMinutes", { minutes: m }) : t("lengthOpen", { max: SESSION.hardCapMinutes })}
              </label>
            ))}
          </div>
        </fieldset>

        <ul className="mt-6 flex flex-col gap-2 text-sm text-muted">
          <li>🎙️ {t("tipMic")}</li>
          <li>🌉 {t("tipBridge", { native: nativeName })}</li>
          <li>💬 {t("tipCaptions")}</li>
        </ul>
        {demo && <p className="mt-4 rounded-xl border border-dashed border-link p-3 text-sm">{t("mockNotice")}</p>}

        <div className="mt-auto pt-8" aria-live="polite">
          {error && <p role="alert" className="mb-3 rounded-xl bg-red-950/60 p-3 text-sm text-red-100">{t(`errors.${error}`)}</p>}
          <button
            type="button"
            onClick={start}
            disabled={phase === "connecting"}
            className="min-h-tap w-full rounded-xl bg-accent px-4 text-lg font-bold text-on-accent disabled:opacity-60"
          >
            {phase === "connecting" ? t("connecting") : error ? t("retry") : t("start")}
          </button>
        </div>
      </main>
    );
  }

  const lastTutor = [...turns].reverse().find((x) => x.role === "tutor");
  const last = turns[turns.length - 1];
  const remaining = limit - elapsed;

  return (
    <main id="main" className="mx-auto flex h-dvh w-full max-w-3xl flex-col">
      {/* ---------------- Video area ---------------- */}
      <section
        aria-label={t("videoLabel", { name: tutorName })}
        className={`relative flex h-[55dvh] shrink-0 items-center justify-center overflow-hidden md:h-[60dvh] ${
          kids ? "m-3 rounded-[2rem] border-4 border-kids-border" : "md:mt-4 md:rounded-card"
        }`}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 scale-110 blur-2xl"
          style={{
            background:
              "radial-gradient(60% 50% at 30% 30%, #0f4c5c 0%, transparent 70%), radial-gradient(50% 45% at 75% 60%, #2e3b55 0%, transparent 70%), radial-gradient(40% 35% at 60% 20%, #bef26422 0%, transparent 70%), #1a202c",
          }}
        />

        {/* top bar */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 p-3 text-white">
          <p className="flex items-center gap-2 rounded-full bg-black/35 px-3 py-1.5 text-sm font-semibold backdrop-blur">
            {tutorName}
            <span className="rounded-full bg-lime px-2 py-0.5 text-xs font-bold text-navy">{level}</span>
          </p>
          <p className="rounded-full bg-black/35 px-3 py-1.5 font-mono text-sm tabular-nums backdrop-blur" role="timer" aria-live="off">
            <span className="sr-only">{t("timerLabel")}: </span>
            {planned ? t("timeLeft", { time: mmss(remaining) }) : `${mmss(elapsed)} / ${mmss(limit)}`}
          </p>
        </div>

        {/* tutor: 3D avatar with lip-sync, or the still portrait */}
        <TutorAvatar
          name={tutorName}
          avatar={avatar}
          speaking={tutorSpeaking}
          transport={liveTransport}
          loadingLabel={t("avatarLoading")}
        />

        {/* object pop-up */}
        <div role="status" aria-live="polite" className="absolute right-3 top-16 md:right-6">
          {show && (
            <div className="w-32 rounded-2xl bg-white p-3 text-center text-navy shadow-lg motion-safe:animate-[pop_250ms_ease-out]">
              <div className="text-5xl" aria-hidden="true">{pictureFor(show.object) ?? "🖼️"}</div>
              <p className="mt-1 font-bold" lang={target}>{show.word}</p>
              <p className="text-xs text-slate-navy">{show.translation}</p>
            </div>
          )}
        </div>

        {/* you tile */}
        <div className="absolute bottom-3 right-3 flex h-20 w-16 flex-col items-center justify-center gap-1 rounded-xl border border-white/20 bg-slate-navy/80 text-white backdrop-blur md:h-24 md:w-20">
          <span className="font-display text-xl" aria-hidden="true">{learnerInitial}</span>
          <span className="text-[10px] font-semibold">{t("you")}</span>
          <VoiceBars ref={learnerBars} small />
        </div>

        {/* captions */}
        {captions && (
          <div
            aria-live="polite"
            className="absolute inset-x-3 bottom-3 mr-20 rounded-xl bg-black/55 p-3 text-white backdrop-blur md:mr-24"
          >
            {lastTutor ? (
              <div className="flex items-start gap-2">
                <VoiceBars ref={tutorBars} />
                <div className="min-w-0">
                  <p lang={target} className={`font-semibold leading-snug ${kids ? "text-xl" : "text-base"}`}>{lastTutor.text}</p>
                  {lastTutor.translation && <p className="mt-0.5 text-sm text-white/75">{lastTutor.translation}</p>}
                </div>
              </div>
            ) : (
              <p className="text-sm text-white/75">{t("connecting")}</p>
            )}
            {last?.role === "learner" && (
              <p className="mt-2 border-t border-white/15 pt-1.5 text-sm text-white/80">
                <span className="font-semibold">{t("you")}:</span> {last.text}
              </p>
            )}
          </div>
        )}
      </section>

      {/* ---------------- Below the video ---------------- */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3">
        {correction && (
          <section aria-live="polite" aria-labelledby="corr-title" className="rounded-card bg-lime-pale p-4 text-navy">
            <div className="flex items-start justify-between gap-2">
              <h2 id="corr-title" className="font-bold">{t("almost")}</h2>
              <button type="button" onClick={() => setCorrection(null)} className="-m-2 min-h-tap min-w-tap text-slate-navy" aria-label={t("dismiss")}>
                ✕
              </button>
            </div>
            <p className="text-sm text-slate-navy">
              {t("youSaid")} <s>{correction.said}</s>
            </p>
            <p lang={target} className={`mt-1 font-bold ${kids ? "text-2xl" : "text-lg"}`}>{correction.correct}</p>
            <p className="mt-1 text-sm">{correction.rule}</p>
            <ol className="mt-3 flex flex-wrap items-center gap-2" aria-label={t("chunks")}>
              {correction.chunks.map((c, i) => (
                <li key={i} className={`rounded-full border-2 border-teal bg-white font-semibold ${kids ? "px-5 py-3 text-lg" : "px-3 py-1.5"}`}>
                  {c}
                </li>
              ))}
            </ol>
            <p className="mt-2 text-xs text-slate-navy">{t("sayAgain")}</p>
          </section>
        )}

        {typing && (
          <form onSubmit={sendTyped} className="flex gap-2">
            <label className="sr-only" htmlFor="typed">{t("typePlaceholder")}</label>
            <input
              id="typed"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t("typePlaceholder")}
              autoComplete="off"
              className="min-h-tap flex-1 rounded-xl border border-line bg-surface px-4 text-fg placeholder:text-muted"
            />
            <button type="submit" className="min-h-tap rounded-xl bg-accent px-4 font-bold text-on-accent">{t("send")}</button>
          </form>
        )}

        {talking && <p className="text-center text-sm font-semibold text-link" aria-live="assertive">{bridge ? t("listeningBridge", { native: nativeName }) : t("listening")}</p>}
      </div>

      {/* ---------------- Call controls ---------------- */}
      <nav aria-label={t("controls")} className="flex items-center justify-around gap-2 border-t border-line px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        <ControlButton label={bridge ? t("bridgeOn", { native: nativeName }) : t("bridge", { native: nativeName })} pressed={bridge} onClick={() => setBridge((b) => !b)}>
          <path d="M3 17h18M6 17V9a6 6 0 0 1 12 0v8M10 17v-4h4v4" />
        </ControlButton>
        <ControlButton label={t("type")} pressed={typing} onClick={() => setTyping((v) => !v)}>
          <path d="M3 7h18v10H3zM7 11h.01M11 11h.01M15 11h.01M8 14h8" />
        </ControlButton>

        <button
          type="button"
          aria-pressed={talking}
          aria-label={talking ? t("listening") : t("holdToTalk")}
          onPointerDown={(e) => {
            e.preventDefault();
            e.currentTarget.setPointerCapture(e.pointerId);
            onPress();
          }}
          onPointerUp={onRelease}
          onPointerCancel={onRelease}
          onKeyDown={(e) => {
            if ((e.key === " " || e.key === "Enter") && !e.repeat) {
              e.preventDefault();
              onPress();
            }
          }}
          onKeyUp={(e) => {
            if (e.key === " " || e.key === "Enter") onRelease();
          }}
          onContextMenu={(e) => e.preventDefault()}
          className={`grid shrink-0 touch-none select-none place-items-center rounded-full bg-lime text-navy shadow-lg transition-transform ${
            kids ? "size-24" : "size-20"
          } ${talking ? "scale-110 ring-4 ring-cyan" : ""}`}
        >
          <svg width={kids ? 40 : 34} height={kids ? 40 : 34} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3ZM5 11a7 7 0 0 0 14 0M12 18v3" />
          </svg>
        </button>

        <ControlButton label={t("captions")} pressed={captions} onClick={() => setCaptions((c) => !c)}>
          <path d="M3 6h18v12H3zM10 10.5a2 2 0 1 0 0 3M17 10.5a2 2 0 1 0 0 3" />
        </ControlButton>
        <button
          type="button"
          onClick={() => void end()}
          aria-label={t("endCall")}
          className="grid size-14 shrink-0 place-items-center rounded-full bg-red-600 text-white hover:bg-red-700"
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 9c-3.3 0-6.3 1-8.6 2.7-.6.4-.7 1.2-.3 1.8l1.4 2c.4.5 1.1.7 1.7.4l2.4-1.2c.5-.3.8-.8.8-1.4V12a12 12 0 0 1 5.2 0v1.3c0 .6.3 1.1.8 1.4l2.4 1.2c.6.3 1.3.1 1.7-.4l1.4-2c.4-.6.3-1.4-.3-1.8C18.3 10 15.3 9 12 9z" />
          </svg>
        </button>
      </nav>

      {phase === "ending" && (
        <div role="alertdialog" aria-modal="true" aria-labelledby="ending" className="fixed inset-0 z-50 grid place-items-center bg-bg/90 backdrop-blur">
          <div className="flex flex-col items-center gap-4">
            <div aria-hidden="true" className="size-12 rounded-full border-4 border-line border-t-accent motion-safe:animate-spin" />
            <p id="ending" className="font-semibold">{t("ending")}</p>
          </div>
        </div>
      )}
    </main>
  );
}

// ------------------------------------------------------------------------

function VoiceBars({ ref, small }: { ref: React.Ref<HTMLDivElement>; small?: boolean }) {
  const weights = [0.6, 1, 0.8, 1, 0.6];
  return (
    <div ref={ref} aria-hidden="true" className={`flex items-center gap-0.5 ${small ? "h-3" : "mt-1 h-4"}`} style={{ ["--lvl" as string]: 0 }}>
      {weights.map((w, i) => (
        <span
          key={i}
          className="w-1 rounded-full bg-lime"
          style={{ height: `calc(${small ? 3 : 4}px + var(--lvl) * ${w} * ${small ? 9 : 12}px)` }}
        />
      ))}
    </div>
  );
}

function ControlButton({
  label,
  pressed,
  onClick,
  children,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      className={`flex min-h-tap min-w-tap max-w-24 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[11px] font-semibold leading-tight ${
        pressed ? "bg-surface-2 text-link" : "text-muted hover:text-fg"
      }`}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {children}
      </svg>
      <span className="text-center">{label}</span>
    </button>
  );
}
