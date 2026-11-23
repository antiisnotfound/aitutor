"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

type State = "idle" | "recording" | "uploading" | "done" | "error";
const MAX_SECONDS = 90;

function pickMime() {
  if (typeof MediaRecorder === "undefined") return null;
  for (const t of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"]) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

/**
 * Records one spoken exam answer, uploads it for transcription (audio is not
 * stored) and shows the transcript. Typing is always available as a backup.
 */
export function SpeakingRecorder({
  attemptId,
  itemId,
  suggestedSeconds,
  typed,
  onTyped,
  onTranscript,
}: {
  attemptId: string;
  itemId: string;
  suggestedSeconds: number;
  typed: string | null;
  onTyped: (text: string | null) => void;
  onTranscript: (text: string) => void;
}) {
  const t = useTranslations("assessment.speaking");
  const [state, setState] = useState<State>("idle");
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const started = useRef(0);

  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
      recorder.current?.stream.getTracks().forEach((tr) => tr.stop());
    },
    [],
  );

  async function start() {
    const mime = pickMime();
    if (mime === null) return onTyped(typed ?? "");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunks.current = [];
      rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      rec.onstop = () => void upload(rec.mimeType || mime || "audio/webm");
      recorder.current = rec;
      rec.start();
      started.current = Date.now();
      setSeconds(0);
      setState("recording");
      timer.current = setInterval(() => {
        const s = Math.floor((Date.now() - started.current) / 1000);
        setSeconds(s);
        if (s >= MAX_SECONDS) stop();
      }, 250);
    } catch {
      // Microphone blocked or missing: switch to typing.
      setState("error");
      onTyped(typed ?? "");
    }
  }

  function stop() {
    if (timer.current) clearInterval(timer.current);
    const rec = recorder.current;
    if (rec && rec.state !== "inactive") {
      rec.stop();
      rec.stream.getTracks().forEach((tr) => tr.stop());
    }
  }

  async function upload(type: string) {
    setState("uploading");
    const blob = new Blob(chunks.current, { type });
    const form = new FormData();
    const ext = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
    form.append("audio", new File([blob], `answer.${ext}`, { type: type.split(";")[0] }));
    form.append("itemId", itemId);
    form.append("seconds", String(Math.round((Date.now() - started.current) / 1000)));
    try {
      const res = await fetch(`/api/assessment/${attemptId}/speaking`, { method: "POST", body: form });
      const data = (await res.json()) as { transcript?: string };
      if (!res.ok || data.transcript === undefined) throw new Error();
      setTranscript(data.transcript);
      onTranscript(data.transcript);
      onTyped(null);
      setState("done");
    } catch {
      setState("error");
    }
  }

  if (typed !== null) {
    return (
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor={`typed-${itemId}`}>{t("typeLabel")}</label>
        <textarea
          id={`typed-${itemId}`}
          value={typed}
          onChange={(e) => onTyped(e.target.value)}
          rows={4}
          className="rounded-xl border border-line bg-surface p-3 text-fg"
        />
        <button type="button" onClick={() => onTyped(null)} className="min-h-tap self-start text-sm font-semibold text-link underline underline-offset-4">
          {t("recordInstead")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-line bg-surface p-4 text-center">
      <p className="text-sm text-muted">{t("suggested", { seconds: suggestedSeconds })}</p>
      {state === "recording" ? (
        <>
          <p className="font-mono text-2xl tabular-nums" role="timer">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</p>
          <button type="button" onClick={stop} className="min-h-tap rounded-full bg-red-600 px-6 font-bold text-white">
            ■ {t("stop")}
          </button>
        </>
      ) : state === "uploading" ? (
        <p aria-live="polite" className="font-semibold">{t("uploading")}</p>
      ) : (
        <button type="button" onClick={start} className="min-h-tap rounded-full bg-accent px-6 font-bold text-on-accent">
          ● {transcript !== null ? t("recordAgain") : t("record")}
        </button>
      )}
      {state === "error" && <p role="alert" className="text-sm text-red-300">{t("error")}</p>}
      {transcript !== null && state !== "recording" && (
        <div className="w-full rounded-xl bg-bg p-3 text-left">
          <p className="text-xs text-muted">{t("weHeard")}</p>
          <p className="mt-1">{transcript || "—"}</p>
        </div>
      )}
      {state !== "recording" && state !== "uploading" && (
        <button type="button" onClick={() => onTyped("")} className="min-h-tap text-sm font-semibold text-link underline underline-offset-4">
          {t("typeInstead")}
        </button>
      )}
    </div>
  );
}
