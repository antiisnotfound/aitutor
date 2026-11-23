import "server-only";
import type { NewWord, SessionEvent, SessionSummary, TranscriptTurn } from "@/lib/session/types";
import type { AiProviderName } from "@/lib/session/types";
import { demoFlag } from "@/lib/demo-config";
import { mockProvider } from "./mock";
import { openaiProvider } from "./openai";
import type { Criterion } from "@/content/exam-a1";
import type { TutorContext } from "./prompts";

/**
 * The single seam between the app and any AI vendor.
 * Swap or add providers here; the rest of the app never imports a vendor SDK.
 */
export type ProductiveInput = {
  kind: "writing" | "speaking";
  target: string;
  native: string;
  level: string;
  task: string;
  contentPoints: string[];
  rubric: Criterion[];
  response: string;
  /** Speaking: the learner typed instead of speaking. */
  typed?: boolean;
  seconds?: number;
};
export type ProductiveGrade = {
  criteria: Record<string, number>; // 0–4 each
  feedback: string; // learner's language
  toWorkOn: string[]; // learner's language
};

export type TokenUsage = { model: string; inputTokens: number; outputTokens: number };

export interface AiProvider {
  name: AiProviderName;
  /** Creates a short-lived credential the browser uses for the live voice call. */
  createRealtimeSession(ctx: TutorContext): Promise<{ model: string; clientSecret?: string }>;
  /** Assessment + learner-facing summary after a session. */
  summarizeSession(
    ctx: TutorContext,
    transcript: TranscriptTurn[],
    events: SessionEvent[],
  ): Promise<{ summary: SessionSummary; usage: TokenUsage }>;
  /** Speech → text (exam speaking answers). Audio is not stored. */
  transcribe(audio: File, language: string): Promise<{ text: string; usage: TokenUsage }>;
  /** Rubric-based grading of a writing or speaking answer. */
  gradeProductive(input: ProductiveInput): Promise<ProductiveGrade & { usage: TokenUsage }>;
  /** Short caption translation (tutor line → learner's native language). */
  translate(text: string, from: string, to: string): Promise<{ text: string; usage: TokenUsage }>;
}

export function getAiProvider(): AiProvider {
  if (process.env.OPENAI_API_KEY) return openaiProvider;
  if (process.env.NODE_ENV !== "production" || demoFlag()) return mockProvider;
  throw new Error("OPENAI_API_KEY is not set");
}

export type { NewWord };
