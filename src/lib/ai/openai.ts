import "server-only";
import OpenAI, { toFile } from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import type { AiProvider } from "./index";
import {
  gradingInstructions,
  LANGUAGE_NAME_EN,
  summaryInstructions,
  transcriptForAssessment,
  TUTOR_TOOLS,
  tutorInstructions,
} from "./prompts";

/** Models are configurable so we can trade quality for cost later. */
const MODELS = {
  realtime: process.env.OPENAI_REALTIME_MODEL ?? "gpt-realtime-2.1",
  transcribe: process.env.OPENAI_TRANSCRIBE_MODEL ?? "gpt-4o-transcribe",
  assess: process.env.OPENAI_ASSESS_MODEL ?? "gpt-5.5",
  translate: process.env.OPENAI_TRANSLATE_MODEL ?? "gpt-5.4-mini",
};
const VOICES = {
  female: process.env.OPENAI_VOICE_FEMALE ?? "marin",
  male: process.env.OPENAI_VOICE_MALE ?? "cedar",
};

let client: OpenAI | null = null;
const openai = () => (client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY }));

const SummarySchema = z.object({
  learned: z.array(z.string()),
  keepInMind: z.array(z.string()),
  newWords: z.array(
    z.object({
      kind: z.enum(["word", "phrase"]),
      term: z.string(),
      translation: z.string(),
      note: z.string().nullable(),
    }),
  ),
  candoUpdates: z.array(
    z.object({
      candoId: z.string(),
      status: z.enum(["practising", "mastered"]),
      note: z.string(),
    }),
  ),
});

const GradeSchema = z.object({
  criteria: z.array(z.object({ id: z.string(), score: z.number().int().min(0).max(4), reason: z.string() })),
  feedback: z.string(),
  toWorkOn: z.array(z.string()),
});

export const openaiProvider: AiProvider = {
  name: "openai",

  async createRealtimeSession(ctx) {
    const secret = await openai().realtime.clientSecrets.create({
      expires_after: { anchor: "created_at", seconds: 600 },
      session: {
        type: "realtime",
        model: MODELS.realtime,
        instructions: tutorInstructions(ctx),
        output_modalities: ["audio"],
        audio: {
          input: {
            transcription: { model: MODELS.transcribe },
            // Push-to-talk: the app decides when the learner's turn ends.
            turn_detection: null,
            noise_reduction: { type: "near_field" },
          },
          output: { voice: VOICES[ctx.tutorGender] },
        },
        tools: TUTOR_TOOLS,
        tool_choice: "auto",
      },
    });
    return { model: MODELS.realtime, clientSecret: secret.value };
  },

  async summarizeSession(ctx, transcript, events) {
    const res = await openai().responses.parse({
      model: MODELS.assess,
      instructions: summaryInstructions(ctx),
      input: transcriptForAssessment(transcript, events),
      text: { format: zodTextFormat(SummarySchema, "session_summary") },
    });
    const parsed = res.output_parsed ?? { learned: [], keepInMind: [], newWords: [], candoUpdates: [] };
    return {
      summary: {
        ...parsed,
        newWords: parsed.newWords.map((w) => ({ ...w, note: w.note ?? undefined })),
      },
      usage: {
        model: MODELS.assess,
        inputTokens: res.usage?.input_tokens ?? 0,
        outputTokens: res.usage?.output_tokens ?? 0,
      },
    };
  },

  async transcribe(audio, language) {
    const file = await toFile(audio, audio.name || "speech.webm", { type: audio.type });
    const res = await openai().audio.transcriptions.create({ file, model: MODELS.transcribe, language });
    return { text: res.text.trim(), usage: { model: MODELS.transcribe, inputTokens: 0, outputTokens: 0 } };
  },

  async gradeProductive(input) {
    const res = await openai().responses.parse({
      model: MODELS.assess,
      instructions: gradingInstructions(input),
      input: input.response.trim() || "(no answer)",
      text: { format: zodTextFormat(GradeSchema, "rubric_grade") },
    });
    const out = res.output_parsed;
    const criteria: Record<string, number> = {};
    for (const c of input.rubric) criteria[c.id] = out?.criteria.find((x) => x.id === c.id)?.score ?? 0;
    return {
      criteria,
      feedback: out?.feedback ?? "",
      toWorkOn: out?.toWorkOn ?? [],
      usage: { model: MODELS.assess, inputTokens: res.usage?.input_tokens ?? 0, outputTokens: res.usage?.output_tokens ?? 0 },
    };
  },

  async translate(text, from, to) {
    const name = (l: string) => LANGUAGE_NAME_EN[l as keyof typeof LANGUAGE_NAME_EN] ?? l;
    const res = await openai().responses.create({
      model: MODELS.translate,
      instructions: `Translate the user's ${name(from)} text into natural ${name(to)} for a beginner's subtitles. Reply with the translation only.`,
      input: text,
    });
    return {
      text: res.output_text.trim(),
      usage: {
        model: MODELS.translate,
        inputTokens: res.usage?.input_tokens ?? 0,
        outputTokens: res.usage?.output_tokens ?? 0,
      },
    };
  },
};
