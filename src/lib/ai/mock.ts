import "server-only";
import type { NewWord } from "@/lib/session/types";
import type { AiProvider } from "./index";

const SUMMARY_TEXT = {
  en: {
    learned: ["You greeted your tutor and said how you are.", "You talked about what you did yesterday."],
    keepInMind: ["Use the past form for yesterday — see the corrected phrase below."],
  },
  sq: {
    learned: ["Përshëndete mësuesin dhe the si je.", "Fole për atë që bëre dje."],
    keepInMind: ["Për dje përdor formën e së shkuarës — shiko frazën e korrigjuar më poshtë."],
  },
  it: {
    learned: ["Hai salutato il tutor e hai detto come stai.", "Hai parlato di cosa hai fatto ieri."],
    keepInMind: ["Per ieri usa il passato — guarda la frase corretta qui sotto."],
  },
};

/** Development stand-in: no network, deterministic output. */
export const mockProvider: AiProvider = {
  name: "mock",

  async createRealtimeSession() {
    return { model: "mock-tutor" };
  },

  async summarizeSession(ctx, transcript, events) {
    const text = SUMMARY_TEXT[ctx.native];
    const newWords = events.flatMap<NewWord>((e) =>
      e.type === "show"
        ? [{ kind: "word" as const, term: e.word, translation: e.translation }]
        : [{ kind: "phrase" as const, term: e.correct, translation: e.rule }],
    );
    const spoke = transcript.some((t) => t.role === "learner");
    return {
      summary: {
        learned: text.learned,
        keepInMind: events.some((e) => e.type === "correction") ? text.keepInMind : [],
        newWords,
        candoUpdates: spoke
          ? ctx.hiddenGoal.candoIds.slice(0, 2).map((candoId, i) => ({
              candoId,
              status: i === 0 ? ("mastered" as const) : ("practising" as const),
              note: "Mock assessment",
            }))
          : [],
      },
      usage: { model: "mock", inputTokens: 0, outputTokens: 0 },
    };
  },

  async transcribe(_audio, language) {
    const text = language === "it"
      ? "Ciao, mi chiamo Anna. Sono albanese e abito a Tirana. Ho un fratello e una sorella."
      : "Hello, my name is Anna. I'm from Albania and I live in Tirana. I have a brother and a sister.";
    return { text, usage: { model: "mock", inputTokens: 0, outputTokens: 0 } };
  },

  /** Rough heuristic so the flow can be tried offline: length and sentence count. */
  async gradeProductive(input) {
    const words = input.response.trim().split(/\s+/).filter(Boolean).length;
    const level = (n: number) => Math.max(0, Math.min(4, n));
    const criteria: Record<string, number> = {};
    for (const c of input.rubric) {
      criteria[c.id] = c.id === "task" ? level(Math.round(words / 7)) : words >= 15 ? 3 : words >= 6 ? 2 : words > 0 ? 1 : 0;
    }
    const text = {
      en: { feedback: "Demo grading (no AI): scored by length only.", tip: "Add one more detail, e.g. a time or a place." },
      sq: { feedback: "Vlerësim demo (pa AI): vetëm sipas gjatësisë.", tip: "Shto edhe një detaj, p.sh. një orë ose një vend." },
      it: { feedback: "Valutazione demo (senza AI): solo in base alla lunghezza.", tip: "Aggiungi un dettaglio, per esempio un orario o un luogo." },
    }[input.native as "en" | "sq" | "it"] ?? { feedback: "", tip: "" };
    return { criteria, feedback: text.feedback, toWorkOn: words < 15 ? [text.tip] : [], usage: { model: "mock", inputTokens: 0, outputTokens: 0 } };
  },

  // The mock client transport ships its own caption translations.
  async translate() {
    return { text: "", usage: { model: "mock", inputTokens: 0, outputTokens: 0 } };
  },
};
