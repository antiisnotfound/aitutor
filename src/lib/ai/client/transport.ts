/** Browser-side, vendor-neutral view of a live tutor call. */
import type { CorrectionEvent, RealtimeUsage, ShowEvent } from "@/lib/session/types";

export type TransportEvent =
  | { type: "ready" }
  | { type: "tutor_delta"; id: string; delta: string }
  | { type: "tutor_done"; id: string; text: string; translation?: string }
  | { type: "learner_pending"; id: string; bridge: boolean }
  | { type: "learner"; id: string; text: string; bridge: boolean }
  | { type: "tutor_speaking"; speaking: boolean }
  | ({ kind: "show" } & Omit<ShowEvent, "type" | "at"> & { type: "show" })
  | ({ kind: "correction" } & Omit<CorrectionEvent, "type" | "at"> & { type: "correction" })
  | { type: "usage"; usage: RealtimeUsage }
  | { type: "error"; message: string; fatal: boolean };

export type Listener = (e: TransportEvent) => void;

export interface RealtimeTransport {
  on(listener: Listener): () => void;
  start(): Promise<void>;
  /** Push-to-talk: open the mic. */
  talkStart(): void;
  /** Push-to-talk: close the mic and let the tutor answer. */
  talkEnd(opts: { bridge: boolean }): void;
  sendText(text: string, opts: { bridge: boolean }): void;
  /** Out-of-band instruction (e.g. "time is nearly up"). */
  nudge(instruction: string): void;
  stop(): void;
  /** 0–1 voice levels for the bars. */
  levels(): { tutor: number; learner: number };
}

export class Emitter {
  private listeners = new Set<Listener>();
  on(l: Listener) {
    this.listeners.add(l);
    return () => {
      this.listeners.delete(l);
    };
  }
  emit(e: TransportEvent) {
    this.listeners.forEach((l) => l(e));
  }
}

/** RMS level (0–1) of an analyser's current frame. */
export function rms(analyser: AnalyserNode | null, buf: Uint8Array<ArrayBuffer> | null): number {
  if (!analyser || !buf) return 0;
  analyser.getByteTimeDomainData(buf);
  let sum = 0;
  for (const v of buf) sum += ((v - 128) / 128) ** 2;
  return Math.min(1, Math.sqrt(sum / buf.length) * 4);
}

export function makeAnalyser(ctx: AudioContext, stream: MediaStream) {
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  ctx.createMediaStreamSource(stream).connect(analyser);
  return { analyser, buf: new Uint8Array(analyser.fftSize) };
}
