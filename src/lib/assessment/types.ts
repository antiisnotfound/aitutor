/** Assessment items. Answers stay on the server; `toPublic` strips them. */
export type ExamSkill = "reading" | "listening" | "writing" | "speaking";

export type ChoiceItem = {
  id: string;
  type: "choice";
  skill: ExamSkill;
  prompt: string;
  /** Language of the prompt text (for `lang` attributes and TTS). */
  promptLang: string;
  /** Text read aloud by the player (listening items). */
  audio?: string;
  options: string[];
  optionsLang: string;
  answer: number;
  /** Vocabulary item this question came from (check-in weak spots). */
  vocabId?: string;
};

export type OrderItem = {
  id: string;
  type: "order";
  skill: ExamSkill;
  /** Chunks in shuffled order. */
  chunks: string[];
  answer: string[];
  lang: string;
  translation?: string;
  vocabId?: string;
};

export type WritingItem = {
  id: string;
  type: "writing";
  skill: "writing";
  prompt: string; // instruction in the learner's language
  minWords: number;
  maxWords: number;
};

export type SpeakingItem = {
  id: string;
  type: "speaking";
  skill: "speaking";
  prompt: string; // instruction in the learner's language
  seconds: number; // suggested length
};

export type AssessmentItem = ChoiceItem | OrderItem | WritingItem | SpeakingItem;

export type Section = {
  id: string;
  skill: ExamSkill;
  /** Reading passage or listening script (target language). */
  passage?: { text: string; lang: string; audio?: boolean };
  items: AssessmentItem[];
};

export type Response =
  | { type: "choice"; value: number }
  | { type: "order"; value: string[] }
  | { type: "text"; value: string; typed?: boolean; seconds?: number };

export type CriterionScores = Record<string, number>; // 0–4 each

export type ItemGrade = { score: number; criteria?: CriterionScores; feedback?: string };

export type AttemptContent = {
  sections: Section[];
  responses: Record<string, Response>;
  grades?: Record<string, ItemGrade>;
};

export type AttemptResult = {
  overall: number;
  perSkill: Partial<Record<ExamSkill, number>>;
  passed: boolean | null; // null for check-ins
  toWorkOn: string[];
};

/** What the browser receives: no answers. */
export function toPublic(sections: Section[]): Section[] {
  return sections.map((s) => ({
    ...s,
    items: s.items.map((i) => {
      if (i.type === "choice") return { ...i, answer: -1, vocabId: undefined } satisfies ChoiceItem;
      if (i.type === "order") return { ...i, answer: [], vocabId: undefined } satisfies OrderItem;
      return i;
    }),
  }));
}
