import "server-only";
import type { NewWord, SessionEvent, SessionSummary, TranscriptTurn } from "@/lib/session/types";
import type { AiProviderName } from "@/lib/session/types";
import { mockProvider } from "./mock";
import { openaiProvider } from "./openai";
import type { TutorContext } from "./prompts";

/**
 * The single seam between the app and any AI vendor.
 * Swap or add providers here; the rest of the app never imports a vendor SDK.
 */
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
  /** Short caption translation (tutor line → learner's native language). */
  translate(text: string, from: string, to: string): Promise<{ text: string; usage: TokenUsage }>;
}

export function getAiProvider(): AiProvider {
  if (process.env.OPENAI_API_KEY) return openaiProvider;
  if (process.env.NODE_ENV !== "production") return mockProvider;
  throw new Error("OPENAI_API_KEY is not set");
}

export type { NewWord };
