import { NextResponse } from "next/server";
import { getAiProvider } from "@/lib/ai";
import { getStore } from "@/lib/data/store";
import { getCurrentUser } from "@/lib/user";

const MAX_BYTES = 8 * 1024 * 1024;
const OK_TYPES = ["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav", "audio/x-m4a", "audio/aac"];

/**
 * Speaking answer: transcribe the recording, keep only the transcript on the
 * attempt (the audio is discarded), and return it so the learner can see it.
 */
export async function POST(req: Request, ctx: RouteContext<"/api/assessment/[id]/speaking">) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  const learner = user?.learner;
  if (!user || !learner) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const audio = form?.get("audio");
  const itemId = String(form?.get("itemId") ?? "");
  const seconds = Math.max(0, Math.min(300, Number(form?.get("seconds") ?? 0)));
  if (!(audio instanceof File) || audio.size === 0 || audio.size > MAX_BYTES || !OK_TYPES.some((t) => audio.type.startsWith(t))) {
    return NextResponse.json({ error: "invalid_audio" }, { status: 400 });
  }

  const store = await getStore();
  const attempt = await store.getAttempt(id, user.id);
  const item = attempt?.content.sections.flatMap((s) => s.items).find((i) => i.id === itemId);
  if (!attempt || attempt.status !== "in_progress" || item?.type !== "speaking") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    const ai = getAiProvider();
    const { text, usage } = await ai.transcribe(audio, learner.targetLanguage);
    await store.updateAttempt(id, {
      content: { ...attempt.content, responses: { ...attempt.content.responses, [itemId]: { type: "text", value: text, seconds } } },
    });
    void store.logUsage({ userId: user.id, sessionId: null, kind: "transcribe", provider: ai.name, model: usage.model, audioSeconds: seconds }).catch(() => {});
    return NextResponse.json({ transcript: text });
  } catch (err) {
    console.error("transcription failed", err);
    return NextResponse.json({ error: "transcription_failed" }, { status: 502 });
  }
}
