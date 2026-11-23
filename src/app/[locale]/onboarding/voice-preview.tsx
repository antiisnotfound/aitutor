"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { TargetLanguage } from "@/config/app";
import { SPEECH_LANG, TUTOR_PREVIEW_LINE, type TutorGender } from "@/config/learning";

const noopSubscribe = () => () => {};

/**
 * Interim voice preview using the browser's built-in speech synthesis.
 * Phase 3 swaps this for a short clip of the real tutor voice.
 */
export function TutorVoicePreview({
  target,
  gender,
  name,
}: {
  target: TargetLanguage;
  gender: TutorGender;
  name: string;
}) {
  const t = useTranslations("onboarding.tutor");
  const supported = useSyncExternalStore(
    noopSubscribe,
    () => "speechSynthesis" in window,
    () => true,
  );
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  function play() {
    const synth = window.speechSynthesis;
    synth.cancel();
    const lang = SPEECH_LANG[target];
    const voices = synth.getVoices().filter((v) => v.lang.toLowerCase().startsWith(lang.slice(0, 2)));
    const u = new SpeechSynthesisUtterance(TUTOR_PREVIEW_LINE[target](name));
    u.lang = lang;
    // Browsers don't expose voice gender; use different voices when we can, plus pitch.
    if (voices.length) u.voice = voices[gender === "female" ? 0 : Math.min(1, voices.length - 1)];
    u.pitch = gender === "female" ? 1.1 : 0.85;
    u.rate = 0.95;
    u.onend = u.onerror = () => setSpeaking(false);
    setSpeaking(true);
    synth.speak(u);
  }

  if (!supported) return <p className="text-sm text-muted">{t("previewUnavailable")}</p>;

  return (
    <button
      type="button"
      onClick={play}
      aria-pressed={speaking}
      className="flex min-h-tap items-center justify-center gap-2 rounded-xl border border-line font-semibold hover:border-link"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M11 5 6 9H2v6h4l5 4V5zM15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {t("preview", { name })}
    </button>
  );
}
