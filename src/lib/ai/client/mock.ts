import type { TargetLanguage, UiLocale } from "@/config/app";
import { SPEECH_LANG } from "@/config/learning";
import { MOCK_SCRIPT, type MockStep } from "@/lib/ai/mock-script";
import { Emitter, makeAnalyser, rms, type RealtimeTransport } from "./transport";

/**
 * Offline stand-in for the live tutor (development without an OpenAI key).
 * Plays a short script with the browser's speech synthesis. The learner's
 * speech isn't recognised: holding the mic "says" the scripted line.
 */
export class MockTransport extends Emitter implements RealtimeTransport {
  readonly hasAudioStream = false;
  private step = 0;
  private speaking = false;
  private talking = false;
  private stopped = false;
  private mic: MediaStream | null = null;
  private ctx: AudioContext | null = null;
  private learnerA: ReturnType<typeof makeAnalyser> | null = null;
  private steps: MockStep[];

  constructor(
    private readonly target: TargetLanguage,
    private readonly native: UiLocale,
    private readonly tutorName: string,
  ) {
    super();
    this.steps = MOCK_SCRIPT[target];
  }

  async start() {
    try {
      this.mic = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mic.getAudioTracks()[0].enabled = false;
      this.ctx = new AudioContext();
      this.learnerA = makeAnalyser(this.ctx, this.mic);
    } catch {
      // The mock works without a microphone.
    }
    this.emit({ type: "ready" });
    setTimeout(() => this.tutorTurn(), 600);
  }

  talkStart() {
    if (this.speaking) speechSynthesis.cancel();
    this.talking = true;
    const t = this.mic?.getAudioTracks()[0];
    if (t) t.enabled = true;
  }

  talkEnd({ bridge }: { bridge: boolean }) {
    this.talking = false;
    const t = this.mic?.getAudioTracks()[0];
    if (t) t.enabled = false;
    const prev = this.steps[Math.max(0, this.step - 1)];
    const id = `mock-l-${this.step}`;
    this.emit({ type: "learner_pending", id, bridge });
    setTimeout(() => {
      this.emit({ type: "learner", id, text: bridge ? "(…)" : prev.learnerSays, bridge });
      setTimeout(() => this.tutorTurn(), 500);
    }, 400);
  }

  sendText(text: string, { bridge }: { bridge: boolean }) {
    this.emit({ type: "learner", id: `mock-t-${Date.now()}`, text, bridge });
    setTimeout(() => this.tutorTurn(), 500);
  }

  nudge() {
    this.step = this.steps.length - 1;
    if (!this.speaking) this.tutorTurn();
  }

  stop() {
    this.stopped = true;
    if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
    this.mic?.getTracks().forEach((t) => t.stop());
    void this.ctx?.close();
  }

  remoteStream() {
    return null; // speech synthesis can't be tapped; the avatar uses levels() instead
  }

  setPlaybackMuted() {}

  levels() {
    const t = performance.now() / 120;
    return {
      tutor: this.speaking ? 0.35 + 0.3 * Math.abs(Math.sin(t)) * Math.abs(Math.cos(t * 0.7)) : 0,
      learner: this.talking ? Math.max(0.15, rms(this.learnerA?.analyser ?? null, this.learnerA?.buf ?? null)) : 0,
    };
  }

  private tutorTurn() {
    if (this.stopped || this.step >= this.steps.length) return;
    const s = this.steps[this.step++];
    const id = `mock-tutor-${this.step}`;
    const text = s.tutor(this.tutorName);
    const words = text.split(" ");

    if (s.correction) {
      this.emit({
        type: "correction", kind: "correction",
        said: s.correction.said, correct: s.correction.correct,
        rule: s.correction.rule[this.native] ?? Object.values(s.correction.rule)[0] ?? "",
        chunks: s.correction.chunks,
      });
    }
    if (s.show) {
      this.emit({
        type: "show", kind: "show",
        object: s.show.object, word: s.show.word,
        translation: s.show.translation[this.native] ?? "",
      });
    }

    this.speaking = true;
    this.emit({ type: "tutor_speaking", speaking: true });
    let i = 0;
    const tick = setInterval(() => {
      if (i < words.length) this.emit({ type: "tutor_delta", id, delta: (i ? " " : "") + words[i++] });
    }, 260);

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearInterval(tick);
      if (this.stopped) return;
      this.speaking = false;
      this.emit({ type: "tutor_done", id, text, translation: s.translation[this.native] });
      this.emit({ type: "tutor_speaking", speaking: false });
    };

    if (typeof speechSynthesis === "undefined") {
      setTimeout(finish, words.length * 300 + 400);
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = SPEECH_LANG[this.target];
    u.rate = 0.9;
    u.onend = finish;
    u.onerror = finish;
    speechSynthesis.speak(u);
    // Some browsers never fire onend for muted / missing voices.
    setTimeout(finish, words.length * 600 + 2000);
  }
}
