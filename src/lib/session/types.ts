/** Shared (client + server) types for the live conversation loop. */
import type { TargetLanguage, UiLocale } from "@/config/app";
import type { TutorGender } from "@/config/learning";

export type TranscriptTurn = {
  id: string;
  role: "tutor" | "learner";
  text: string;
  /** Tutor turns: translation into the learner's native language. */
  translation?: string;
  /** Learner spoke in their native language via the bridge button. */
  bridge?: boolean;
  at: number; // ms since session start
};

export type ShowEvent = {
  type: "show";
  object: string; // English key for the illustration library, e.g. "apple"
  word: string; // target language, e.g. "la mela"
  translation: string; // native language, e.g. "the apple"
  at: number;
};

export type CorrectionEvent = {
  type: "correction";
  said: string;
  correct: string;
  rule: string; // short, in the learner's native language
  chunks: string[];
  at: number;
};

export type SessionEvent = ShowEvent | CorrectionEvent;

export type HiddenGoal = {
  candoIds: string[];
  /** English description for the tutor prompt. */
  focus: string;
  /** "Keep in mind" items from recent sessions to recycle. */
  review: string[];
};

export type RealtimeUsage = {
  inputTokens: number;
  outputTokens: number;
  inputAudioTokens: number;
  outputAudioTokens: number;
};

export const emptyUsage = (): RealtimeUsage => ({
  inputTokens: 0, outputTokens: 0, inputAudioTokens: 0, outputAudioTokens: 0,
});

export type NewWord = { kind: "word" | "phrase"; term: string; translation: string; note?: string };

export type SessionSummary = {
  learned: string[];
  keepInMind: string[];
  newWords: NewWord[];
  candoUpdates: { candoId: string; status: "practising" | "mastered"; note: string }[];
};

export type AiProviderName = "openai" | "mock";

export type StartSessionResponse = {
  sessionId: string;
  provider: AiProviderName;
  model: string;
  /** Short-lived key for the browser's realtime connection (never the real API key). */
  clientSecret?: string;
  mode: "placement" | "practice";
  plannedMinutes: number | null;
  hardCapMinutes: number;
  tutor: { name: string; gender: TutorGender };
  target: TargetLanguage;
  native: UiLocale;
};

export type EndSessionRequest = {
  transcript: TranscriptTurn[];
  events: SessionEvent[];
  usage: RealtimeUsage;
};
