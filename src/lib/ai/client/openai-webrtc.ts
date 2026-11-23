import type { RealtimeUsage } from "@/lib/session/types";
import { Emitter, makeAnalyser, rms, type RealtimeTransport } from "./transport";

type ServerEvent = { type: string; [k: string]: unknown };

const bridgeNote = (native: string) =>
  `System note: the learner is about to speak in their native language (${native}). Reply briefly in ${native}, give them the target-language phrase, and ask them to say it.`;

/**
 * OpenAI Realtime over WebRTC. The browser only ever sees a short-lived
 * client secret minted by our server; audio flows directly to OpenAI.
 */
export class OpenAIWebRTCTransport extends Emitter implements RealtimeTransport {
  readonly hasAudioStream = true;
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private mic: MediaStream | null = null;
  private audioEl: HTMLAudioElement | null = null;
  private ctx: AudioContext | null = null;
  private tutorA: ReturnType<typeof makeAnalyser> | null = null;
  private learnerA: ReturnType<typeof makeAnalyser> | null = null;
  private tutorSpeaking = false;
  private nextIsBridge = false;
  /** item_id → bridge flag for learner turns awaiting transcription */
  private pendingBridge = new Map<string, boolean>();

  constructor(private readonly clientSecret: string, private readonly nativeName: string) {
    super();
  }

  async start() {
    this.ctx = new AudioContext();
    this.mic = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    const track = this.mic.getAudioTracks()[0];
    track.enabled = false; // push-to-talk
    this.learnerA = makeAnalyser(this.ctx, this.mic);

    const pc = (this.pc = new RTCPeerConnection());
    this.audioEl = new Audio();
    this.audioEl.autoplay = true;
    pc.ontrack = (e) => {
      const stream = e.streams[0];
      this.audioEl!.srcObject = stream;
      if (this.ctx) this.tutorA = makeAnalyser(this.ctx, stream);
    };
    pc.addTrack(track, this.mic);
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        this.emit({ type: "error", message: "connection", fatal: true });
      }
    };

    const dc = (this.dc = pc.createDataChannel("oai-events"));
    dc.onmessage = (m) => this.handle(JSON.parse(m.data) as ServerEvent);
    dc.onopen = () => {
      this.emit({ type: "ready" });
      this.send({ type: "response.create" }); // tutor greets first
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    const res = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      body: offer.sdp,
      headers: { Authorization: `Bearer ${this.clientSecret}`, "Content-Type": "application/sdp" },
    });
    if (!res.ok) throw new Error(`Realtime connection failed (${res.status})`);
    await pc.setRemoteDescription({ type: "answer", sdp: await res.text() });
  }

  talkStart() {
    if (this.tutorSpeaking) {
      // Barge-in: stop the tutor so the learner can speak.
      this.send({ type: "response.cancel" });
      this.send({ type: "output_audio_buffer.clear" });
    }
    this.send({ type: "input_audio_buffer.clear" });
    const track = this.mic?.getAudioTracks()[0];
    if (track) track.enabled = true;
  }

  talkEnd({ bridge }: { bridge: boolean }) {
    const track = this.mic?.getAudioTracks()[0];
    // Let the last few ms of audio reach the server before committing.
    setTimeout(() => {
      if (track) track.enabled = false;
      this.nextIsBridge = bridge;
      if (bridge) this.systemNote(bridgeNote(this.nativeName));
      this.send({ type: "input_audio_buffer.commit" });
      this.send({ type: "response.create" });
    }, 250);
  }

  sendText(text: string, { bridge }: { bridge: boolean }) {
    if (bridge) this.systemNote(bridgeNote(this.nativeName));
    const id = `txt${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
    this.send({
      type: "conversation.item.create",
      item: { id, type: "message", role: "user", content: [{ type: "input_text", text }] },
    });
    this.emit({ type: "learner", id, text, bridge });
    this.send({ type: "response.create" });
  }

  nudge(instruction: string) {
    this.systemNote(`System note: ${instruction}`);
    if (!this.tutorSpeaking) this.send({ type: "response.create" });
  }

  stop() {
    this.dc?.close();
    this.pc?.getSenders().forEach((s) => s.track?.stop());
    this.pc?.close();
    this.mic?.getTracks().forEach((t) => t.stop());
    if (this.audioEl) this.audioEl.srcObject = null;
    void this.ctx?.close();
  }

  remoteStream() {
    return (this.audioEl?.srcObject as MediaStream | null) ?? null;
  }

  setPlaybackMuted(muted: boolean) {
    // The element must keep the stream attached (Chrome only feeds WebRTC
    // audio into Web Audio while a media element consumes it), so mute it.
    if (this.audioEl) this.audioEl.muted = muted;
  }

  levels() {
    return {
      tutor: rms(this.tutorA?.analyser ?? null, this.tutorA?.buf ?? null),
      learner: this.mic?.getAudioTracks()[0]?.enabled ? rms(this.learnerA?.analyser ?? null, this.learnerA?.buf ?? null) : 0,
    };
  }

  // ---------------------------------------------------------------------

  private send(event: Record<string, unknown>) {
    if (this.dc?.readyState === "open") this.dc.send(JSON.stringify(event));
  }

  private systemNote(text: string) {
    this.send({
      type: "conversation.item.create",
      item: { type: "message", role: "system", content: [{ type: "input_text", text }] },
    });
  }

  private handle(e: ServerEvent) {
    switch (e.type) {
      case "input_audio_buffer.committed": {
        const id = e.item_id as string;
        this.pendingBridge.set(id, this.nextIsBridge);
        this.emit({ type: "learner_pending", id, bridge: this.nextIsBridge });
        this.nextIsBridge = false;
        break;
      }
      case "conversation.item.input_audio_transcription.completed": {
        const id = e.item_id as string;
        this.emit({ type: "learner", id, text: String(e.transcript ?? "").trim(), bridge: this.pendingBridge.get(id) ?? false });
        this.pendingBridge.delete(id);
        break;
      }
      case "response.output_audio_transcript.delta":
        this.emit({ type: "tutor_delta", id: e.item_id as string, delta: String(e.delta ?? "") });
        break;
      case "response.output_audio_transcript.done":
        this.emit({ type: "tutor_done", id: e.item_id as string, text: String(e.transcript ?? "") });
        break;
      case "output_audio_buffer.started":
        this.tutorSpeaking = true;
        this.emit({ type: "tutor_speaking", speaking: true });
        break;
      case "output_audio_buffer.stopped":
      case "output_audio_buffer.cleared":
        this.tutorSpeaking = false;
        this.emit({ type: "tutor_speaking", speaking: false });
        break;
      case "response.function_call_arguments.done":
        this.handleTool(e.call_id as string, e.name as string, String(e.arguments ?? "{}"));
        break;
      case "response.done":
        this.handleResponseDone(e.response as ResponseDone);
        break;
      case "error": {
        const err = e.error as { message?: string; code?: string } | undefined;
        // Cancelling when nothing is playing is harmless.
        if (err?.code === "response_cancel_not_active") break;
        this.emit({ type: "error", message: err?.message ?? "error", fatal: false });
        break;
      }
    }
  }

  private handleTool(callId: string, name: string, args: string) {
    try {
      const a = JSON.parse(args);
      if (name === "show_object") {
        this.emit({ type: "show", kind: "show", object: String(a.object), word: String(a.word), translation: String(a.translation) });
      } else if (name === "correct_learner") {
        this.emit({
          type: "correction", kind: "correction",
          said: String(a.said), correct: String(a.correct), rule: String(a.rule),
          chunks: Array.isArray(a.chunks) ? a.chunks.map(String) : [String(a.correct)],
        });
      }
    } catch {
      /* ignore malformed tool args */
    }
    this.send({
      type: "conversation.item.create",
      item: { type: "function_call_output", call_id: callId, output: JSON.stringify({ shown: true }) },
    });
  }

  private handleResponseDone(r: ResponseDone | undefined) {
    if (!r) return;
    const u = r.usage;
    if (u) {
      const usage: RealtimeUsage = {
        inputTokens: u.input_tokens ?? 0,
        outputTokens: u.output_tokens ?? 0,
        inputAudioTokens: u.input_token_details?.audio_tokens ?? 0,
        outputAudioTokens: u.output_token_details?.audio_tokens ?? 0,
      };
      this.emit({ type: "usage", usage });
    }
    // If the model only called a tool and said nothing, let it continue speaking.
    const output = r.output ?? [];
    if (r.status === "completed" && output.length && output.every((o) => o.type === "function_call")) {
      this.send({ type: "response.create" });
    }
  }
}

type ResponseDone = {
  status?: string;
  output?: { type: string }[];
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    input_token_details?: { audio_tokens?: number };
    output_token_details?: { audio_tokens?: number };
  };
};
