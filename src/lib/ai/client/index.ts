import type { UiLocale } from "@/config/app";
import type { StartSessionResponse } from "@/lib/session/types";
import { MockTransport } from "./mock";
import { OpenAIWebRTCTransport } from "./openai-webrtc";
import type { RealtimeTransport } from "./transport";

const NATIVE_NAME: Record<UiLocale, string> = { en: "English", sq: "Albanian", it: "Italian" };

export function createTransport(s: StartSessionResponse): RealtimeTransport {
  if (s.provider === "openai" && s.clientSecret) return new OpenAIWebRTCTransport(s.clientSecret, NATIVE_NAME[s.native]);
  return new MockTransport(s.target, s.native, s.tutor.name);
}

export type { RealtimeTransport, TransportEvent } from "./transport";
