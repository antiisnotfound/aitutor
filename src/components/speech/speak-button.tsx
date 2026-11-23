"use client";

import { SPEECH_LANG } from "@/config/learning";

/** Reads a word or sentence aloud with the browser's voice (target language). */
export function speak(text: string, lang: keyof typeof SPEECH_LANG, rate = 0.85) {
  if (typeof speechSynthesis === "undefined") return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = SPEECH_LANG[lang];
  u.rate = rate;
  speechSynthesis.speak(u);
}

export function SpeakButton({ text, lang, label, big }: { text: string; lang: keyof typeof SPEECH_LANG; label: string; big?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => speak(text, lang)}
      aria-label={label}
      className={`grid shrink-0 place-items-center rounded-full border border-line text-link hover:border-link ${big ? "size-16" : "min-h-tap min-w-tap"}`}
    >
      <svg width={big ? 28 : 20} height={big ? 28 : 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M11 5 6 9H2v6h4l5 4V5zM15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" />
      </svg>
    </button>
  );
}
