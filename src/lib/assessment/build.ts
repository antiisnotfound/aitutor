import type { TargetLanguage, UiLocale } from "@/config/app";
import { ASSESSMENT } from "@/config/app";
import { A1_SENTENCES, A1_WORDS } from "@/content/a1-words";
import { A1_EXAM } from "@/content/exam-a1";
import type { VocabItem } from "@/lib/data/store";
import type { ChoiceItem, OrderItem, Section } from "./types";

type Rng = () => number;

export function shuffle<T>(arr: T[], rng: Rng = Math.random): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type Entry = { term: string; translation: string; vocabId?: string };

/**
 * Check-in quiz (~10 questions) on recently practised words and phrases,
 * topped up with A1 starter words for new learners.
 *  - reading: word → meaning, meaning → word
 *  - listening: hear the word → meaning
 *  - writing: put a phrase in order
 */
export function buildCheckin(opts: {
  target: TargetLanguage;
  native: UiLocale;
  vocab: VocabItem[];
  rng?: Rng;
}): Section[] {
  const rng = opts.rng ?? Math.random;
  const starter: Entry[] = A1_WORDS[opts.target]
    .filter((w) => w.tr[opts.native])
    .map((w) => ({ term: w.term, translation: w.tr[opts.native]! }));

  const learnerWords: Entry[] = opts.vocab
    .filter((v) => v.kind === "word")
    .map((v) => ({ term: v.term, translation: v.translation, vocabId: v.id }));

  // Learner's own words first, then starter words not already known.
  const seen = new Set(learnerWords.map((w) => w.term.toLowerCase()));
  const pool = [...learnerWords, ...shuffle(starter.filter((w) => !seen.has(w.term.toLowerCase())), rng)];
  const questionWords = pool.slice(0, ASSESSMENT.checkInQuestions - 1);

  const distractors = (correct: Entry, field: "term" | "translation") =>
    shuffle(
      [...new Map([...pool, ...starter].filter((w) => w[field] !== correct[field]).map((w) => [w[field], w])).values()],
      rng,
    )
      .slice(0, 3)
      .map((w) => w[field]);

  const choice = (id: string, w: Entry, mode: "meaning" | "reverse" | "listen"): ChoiceItem => {
    const field = mode === "reverse" ? "term" : "translation";
    const correct = w[field];
    const options = shuffle([correct, ...distractors(w, field)], rng);
    return {
      id,
      type: "choice",
      skill: mode === "listen" ? "listening" : "reading",
      prompt: mode === "reverse" ? w.translation : mode === "listen" ? "" : w.term,
      promptLang: mode === "reverse" ? opts.native : opts.target,
      ...(mode === "listen" ? { audio: w.term } : {}),
      options,
      optionsLang: mode === "reverse" ? opts.target : opts.native,
      answer: options.indexOf(correct),
      vocabId: w.vocabId,
    };
  };

  const modes: ("meaning" | "reverse" | "listen")[] = ["meaning", "meaning", "meaning", "meaning", "reverse", "reverse", "reverse", "listen", "listen"];
  const items = questionWords.map((w, i) => choice(`q${i + 1}`, w, modes[i % modes.length]));

  // One "put it in order" item from a saved phrase (or a starter sentence).
  const phrase = opts.vocab.find((v) => v.kind === "phrase" && v.term.split(/\s+/).length >= 3);
  const sentence = phrase
    ? { chunks: chunkPhrase(phrase.term), tr: phrase.translation, vocabId: phrase.id }
    : (() => {
        const s = A1_SENTENCES[opts.target][Math.floor(rng() * A1_SENTENCES[opts.target].length)];
        return { chunks: s.chunks, tr: s.tr[opts.native] ?? "", vocabId: undefined };
      })();
  let shuffled = shuffle(sentence.chunks, rng);
  if (shuffled.join() === sentence.chunks.join()) shuffled = [...sentence.chunks].reverse();
  const order: OrderItem = {
    id: "q10",
    type: "order",
    skill: "writing",
    chunks: shuffled,
    answer: sentence.chunks,
    lang: opts.target,
    translation: sentence.tr,
    vocabId: sentence.vocabId,
  };

  return [
    { id: "words", skill: "reading", items: items.filter((i) => i.skill === "reading") },
    { id: "listen", skill: "listening", items: items.filter((i) => i.skill === "listening") },
    { id: "order", skill: "writing", items: [order] },
  ].filter((s) => s.items.length > 0) as Section[];
}

/** Split a phrase into 3–5 chunks for the ordering exercise. */
export function chunkPhrase(phrase: string): string[] {
  const words = phrase.replace(/[.!?]$/, "").split(/\s+/).filter(Boolean);
  if (words.length <= 5) return words;
  const size = Math.ceil(words.length / 5);
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += size) chunks.push(words.slice(i, i + size).join(" "));
  return chunks;
}

/** The A1 level-up exam paper in the learner's languages. */
export function buildLevelUp(opts: { target: TargetLanguage; native: UiLocale }): Section[] {
  const paper = A1_EXAM[opts.target];
  const choiceItems = (p: (typeof paper.reading)[number], skill: "reading" | "listening"): ChoiceItem[] =>
    p.questions.map((q, i) => ({
      id: `${p.id}q${i + 1}`,
      type: "choice",
      skill,
      prompt: q.q,
      promptLang: opts.target,
      options: q.options,
      optionsLang: opts.target,
      answer: q.answer,
    }));
  const local = (p: Partial<Record<UiLocale, string>>) => p[opts.native] ?? Object.values(p)[0] ?? "";

  return [
    ...paper.reading.map<Section>((p) => ({
      id: p.id, skill: "reading", passage: { text: p.text, lang: opts.target }, items: choiceItems(p, "reading"),
    })),
    ...paper.listening.map<Section>((p) => ({
      id: p.id, skill: "listening", passage: { text: p.text, lang: opts.target, audio: true }, items: choiceItems(p, "listening"),
    })),
    {
      id: "writing",
      skill: "writing",
      items: [{ id: paper.writing.id, type: "writing", skill: "writing", prompt: local(paper.writing.prompt), minWords: paper.writing.minWords, maxWords: paper.writing.maxWords }],
    },
    {
      id: "speaking",
      skill: "speaking",
      items: paper.speaking.map((s) => ({ id: s.id, type: "speaking" as const, skill: "speaking" as const, prompt: local(s.prompt), seconds: s.seconds })),
    },
  ];
}
