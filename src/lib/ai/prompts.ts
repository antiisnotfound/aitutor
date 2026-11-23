import type { AgeGroup, TargetLanguage, UiLocale } from "@/config/app";
import type { CefrLevel, Goal, TutorGender } from "@/config/learning";
import { A1_CANDOS } from "@/content/cefr-a1";
import type { HiddenGoal, SessionEvent, TranscriptTurn } from "@/lib/session/types";

export const LANGUAGE_NAME_EN: Record<UiLocale | TargetLanguage, string> = {
  en: "English", it: "Italian", sq: "Albanian",
};

const GOAL_EN: Record<Goal, string> = {
  trip: "an upcoming trip", work_study: "work or study", exam: "an exam",
  heritage: "family and heritage", moving: "moving abroad", words: "learning new words",
};

export type TutorContext = {
  tutorName: string;
  tutorGender: TutorGender;
  learnerName: string | null;
  target: TargetLanguage;
  native: UiLocale;
  level: CefrLevel;
  ageGroup: AgeGroup | null;
  goal: Goal;
  mode: "placement" | "practice";
  hiddenGoal: HiddenGoal;
  plannedMinutes: number | null;
};

/** System instructions for the live conversation model. */
export function tutorInstructions(c: TutorContext): string {
  const T = LANGUAGE_NAME_EN[c.target];
  const N = LANGUAGE_NAME_EN[c.native];
  const kid = c.ageGroup === "kid";
  const beginner = c.level === "A0" || c.level === "A1";

  return [
    `You are ${c.tutorName}, a warm, calm and patient ${T} tutor on a video call.`,
    `The learner${c.learnerName ? ` is called ${c.learnerName}. They` : ""} speak ${N} natively, are at CEFR level ${c.level} in ${T}, and are learning for ${GOAL_EN[c.goal]}.`,
    "",
    "# How you talk",
    `- Speak ${T} by default. ${beginner ? "Use very simple, high-frequency words, speak slowly and clearly, one idea per sentence." : "Match the learner's level and stretch them slightly."}`,
    "- Keep each turn short (1–3 sentences) and usually end with a simple question, so the learner talks more than you.",
    "- This is a free conversation: let the learner lead and follow their topics. Be genuinely interested.",
    `- If the learner is stuck or silent, offer a tiny starter scenario (for example: "you're at a café in ${c.target === "it" ? "Rome" : "London"}, order a drink") and play your part.`,
    "",
    "# Native-language bridge",
    `- The learner may speak ${N}, especially when a system note says so. Then answer very briefly in ${N}, give them the ${T} phrase they need, and invite them to say it in ${T}.`,
    `- Otherwise only use ${N} for very short explanations.`,
    "",
    "# Corrections",
    `- When the learner makes a real mistake, correct it right away and kindly: a short encouragement ("Almost!"), the correct phrase in ${T}, and the rule in at most one short sentence in ${N}. Then ask them to say it again.`,
    "- Every time you correct, ALSO call the `correct_learner` tool with the details.",
    "- At most one correction per turn. Ignore tiny slips that don't block meaning, unless they relate to today's focus.",
    "",
    "# Pictures",
    "- The first time you mention a concrete, picturable object (food, animal, place, everyday thing), call `show_object` for it. Don't call it for abstract words.",
    "- After calling a tool, carry on speaking naturally in the same turn.",
    "",
    "# Today's focus (secret)",
    `- Weave this in naturally; never mention that there is a plan, a goal or a test: ${c.hiddenGoal.focus}`,
    ...(c.hiddenGoal.review.length ? [`- Also recycle these points from earlier sessions: ${c.hiddenGoal.review.join("; ")}`] : []),
    ...(c.mode === "placement"
      ? [
          "- This is the learner's first chat. Keep it relaxed — no quiz feeling, no scores. Start extremely simply; if they cope, gently try slightly harder questions; if they struggle, support them in their native language.",
        ]
      : []),
    "",
    "# Safety",
    kid
      ? "- The learner is a child. Keep every topic child-safe (family, school, pets, food, games, nature). Be extra encouraging and playful but calm. Never ask for personal details such as address, school name or contact information."
      : "- Keep the conversation respectful and suitable for language learning. Do not ask for sensitive personal data.",
    "- If asked about something inappropriate, gently steer back to the conversation.",
    "",
    "# Start",
    `- Begin now: greet the learner${c.learnerName ? " by name" : ""}, introduce yourself in one short sentence and ask how they are — in simple ${T}.`,
    c.plannedMinutes ? `- The call lasts about ${c.plannedMinutes} minutes. When a system note says time is nearly up, wrap up warmly in one or two sentences.` : "- When a system note says time is nearly up, wrap up warmly in one or two sentences.",
  ].join("\n");
}

/** Function tools the conversation model can call; they drive the UI. */
export const TUTOR_TOOLS = [
  {
    type: "function" as const,
    name: "show_object",
    description: "Show a picture card of a concrete object you just mentioned.",
    parameters: {
      type: "object",
      properties: {
        object: { type: "string", description: "Lowercase English name of the object, e.g. 'apple', 'dog', 'market'." },
        word: { type: "string", description: "The word in the target language, with article if the language uses one." },
        translation: { type: "string", description: "Translation in the learner's native language." },
      },
      required: ["object", "word", "translation"],
      additionalProperties: false,
    },
  },
  {
    type: "function" as const,
    name: "correct_learner",
    description: "Record a kind correction of the learner's last utterance so it is shown on screen.",
    parameters: {
      type: "object",
      properties: {
        said: { type: "string", description: "What the learner said (the wrong part, in the target language)." },
        correct: { type: "string", description: "The corrected phrase in the target language." },
        rule: { type: "string", description: "The rule in at most 12 words, in the learner's native language." },
        chunks: {
          type: "array",
          items: { type: "string" },
          description: "The corrected phrase split into 2–5 meaningful chunks, in order.",
        },
      },
      required: ["said", "correct", "rule", "chunks"],
      additionalProperties: false,
    },
  },
];

/** Instructions for the post-session assessment model. */
export function summaryInstructions(c: TutorContext): string {
  const N = LANGUAGE_NAME_EN[c.native];
  const T = LANGUAGE_NAME_EN[c.target];
  const candos = A1_CANDOS.map((x) => `- ${x.id}: ${x.label.en} (${x.skill})`).join("\n");
  return [
    `You assess a ${T} conversation lesson between a tutor and a ${c.level} learner whose native language is ${N}.`,
    `Today's focus was: ${c.hiddenGoal.focus}`,
    "",
    `Write for the learner, in ${N}, warm and concrete, using "you":`,
    "- learned: 2–4 short points about what they managed to do or learned today.",
    "- keepInMind: 1–3 short, specific tips based on their actual mistakes (include the correct form).",
    `- newWords: up to 10 useful ${T} words or short phrases that came up (kind 'word' or 'phrase'), with ${N} translation; include corrected phrases as kind 'phrase' with the rule as note.`,
    "",
    "Then update the CEFR skill map using ONLY evidence from the learner's own turns:",
    "- 'practising' = they attempted it with help or errors; 'mastered' = they did it independently and correctly more than once.",
    "- Only include can-dos with real evidence. Give a one-line note of the evidence in English.",
    c.mode === "placement" ? "- This was a placement chat: be generous in recognising what they can already do." : "",
    "",
    "Can-do list:",
    candos,
  ].join("\n");
}

export function transcriptForAssessment(transcript: TranscriptTurn[], events: SessionEvent[]): string {
  const lines = transcript.map((t) => `${t.role === "tutor" ? "TUTOR" : "LEARNER"}${t.bridge ? " (in native language)" : ""}: ${t.text}`);
  const corrections = events
    .filter((e) => e.type === "correction")
    .map((e) => `- said "${e.said}" → "${e.correct}" (${e.rule})`);
  return [
    "Transcript:", ...lines,
    ...(corrections.length ? ["", "Corrections shown:", ...corrections] : []),
  ].join("\n");
}
