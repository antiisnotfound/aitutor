import { NextResponse } from "next/server";
import { z } from "zod";
import { SESSION } from "@/config/app";
import { A1_CANDOS } from "@/content/cefr-a1";
import { getAiProvider } from "@/lib/ai";
import { getStore } from "@/lib/data/store";
import { tutorContext } from "@/lib/session/context";
import { getCurrentUser } from "@/lib/user";

const Turn = z.object({
  id: z.string().max(100),
  role: z.enum(["tutor", "learner"]),
  text: z.string().max(4000),
  translation: z.string().max(4000).optional(),
  bridge: z.boolean().optional(),
  at: z.number(),
});
const Event = z.discriminatedUnion("type", [
  z.object({ type: z.literal("show"), object: z.string().max(80), word: z.string().max(120), translation: z.string().max(120), at: z.number() }),
  z.object({
    type: z.literal("correction"), said: z.string().max(400), correct: z.string().max(400),
    rule: z.string().max(400), chunks: z.array(z.string().max(120)).max(8), at: z.number(),
  }),
]);
const Body = z.object({
  transcript: z.array(Turn).max(600),
  events: z.array(Event).max(200),
  usage: z.object({
    inputTokens: z.number().int().nonnegative(), outputTokens: z.number().int().nonnegative(),
    inputAudioTokens: z.number().int().nonnegative(), outputAudioTokens: z.number().int().nonnegative(),
  }),
});

/**
 * Ends a session: assess it, write the summary, update the skill map and
 * vocabulary queue, and log usage. Raw audio is never stored.
 */
export async function POST(req: Request, ctx: RouteContext<"/api/session/[id]/end">) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  const learner = user?.learner;
  if (!user || !learner) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const { transcript, events, usage } = parsed.data;

  const store = await getStore();
  const session = await store.getSession(id, user.id);
  if (!session) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (session.status !== "active") return NextResponse.json({ status: session.status });

  // Server clock decides the duration (capped at the hard limit + a little grace).
  const elapsed = Math.round((Date.now() - Date.parse(session.startedAt)) / 1000);
  const durationSeconds = Math.min(elapsed, SESSION.hardCapMinutes * 60 + 60);
  const ai = getAiProvider();

  void store.logUsage({
    userId: user.id, sessionId: id, kind: "realtime", provider: ai.name, model: "realtime",
    inputTokens: usage.inputTokens, outputTokens: usage.outputTokens,
    inputAudioTokens: usage.inputAudioTokens, outputAudioTokens: usage.outputAudioTokens,
    audioSeconds: durationSeconds,
  }).catch(() => {});

  const learnerSpoke = transcript.some((t) => t.role === "learner" && t.text.trim().length > 0);
  if (!learnerSpoke) {
    await store.finishSession(id, { status: "abandoned", durationSeconds, transcript, events, summary: null });
    return NextResponse.json({ status: "abandoned" });
  }

  try {
    const tctx = tutorContext(user, learner, session);
    const { summary, usage: sUsage } = await ai.summarizeSession(tctx, transcript, events);

    // Only accept can-do ids we know about.
    const known = new Set(A1_CANDOS.map((c) => c.id));
    summary.candoUpdates = summary.candoUpdates.filter((u) => known.has(u.candoId));

    await store.finishSession(id, { status: "completed", durationSeconds, transcript, events, summary });
    await Promise.all([
      store.applySkillUpdates(learner.id, id, summary.candoUpdates),
      store.addVocabulary(learner.id, id, summary.newWords.slice(0, 15)),
      session.mode === "placement" ? store.markPlacementDone(learner.id) : Promise.resolve(),
      store.logUsage({
        userId: user.id, sessionId: id, kind: "summary", provider: ai.name, model: sUsage.model,
        inputTokens: sUsage.inputTokens, outputTokens: sUsage.outputTokens,
      }).catch(() => {}),
    ]);
    return NextResponse.json({ status: "completed" });
  } catch (err) {
    console.error("session/end failed", err);
    // Keep the transcript even if assessment failed.
    await store.finishSession(id, { status: "completed", durationSeconds, transcript, events, summary: null }).catch(() => {});
    return NextResponse.json({ status: "completed", warning: "summary_failed" });
  }
}
