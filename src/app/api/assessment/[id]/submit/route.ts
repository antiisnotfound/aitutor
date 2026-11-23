import { NextResponse } from "next/server";
import { z } from "zod";
import { A1_EXAM, RUBRICS } from "@/content/exam-a1";
import { getAiProvider } from "@/lib/ai";
import { computeResult, gradeObjective, rubricScore } from "@/lib/assessment/grade";
import type { AttemptContent, ExamSkill, ItemGrade, Response } from "@/lib/assessment/types";
import { getStore, type AttemptFeedback } from "@/lib/data/store";
import { lapse } from "@/lib/learning/srs";
import { getCurrentUser } from "@/lib/user";

const ResponseSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("choice"), value: z.number().int().min(-1).max(10) }),
  z.object({ type: z.literal("order"), value: z.array(z.string().max(200)).max(10) }),
  z.object({ type: z.literal("text"), value: z.string().max(3000), typed: z.boolean().optional() }),
]);
const Body = z.object({ responses: z.record(z.string().max(40), ResponseSchema) });

/** Grades a quiz/exam: objective items automatically, writing/speaking with the AI rubric. */
export async function POST(req: Request, ctx: RouteContext<"/api/assessment/[id]/submit">) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  const learner = user?.learner;
  if (!user || !learner) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const store = await getStore();
  const attempt = await store.getAttempt(id, user.id);
  if (!attempt) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (attempt.status !== "in_progress") return NextResponse.json({ status: attempt.status });

  // Merge: recorded speaking transcripts (stored server-side) win over anything the browser sends,
  // except a typed backup for an item that has no recording.
  const items = attempt.content.sections.flatMap((s) => s.items);
  const responses: Record<string, Response> = {};
  for (const item of items) {
    const stored = attempt.content.responses[item.id];
    const sent = parsed.data.responses[item.id];
    if (item.type === "speaking") {
      if (stored) responses[item.id] = stored;
      else if (sent?.type === "text") responses[item.id] = { type: "text", value: sent.value, typed: true };
    } else if (sent) {
      responses[item.id] = sent;
    }
  }
  const content: AttemptContent = { ...attempt.content, responses };

  const grades: Record<string, ItemGrade> = gradeObjective(content);
  const feedback: AttemptFeedback = { toWorkOn: [], weakSkills: [], productive: {} };
  const ai = getAiProvider();

  // Writing & speaking (level-up exam only).
  if (attempt.kind === "levelup") {
    const paper = A1_EXAM[learner.targetLanguage];
    const tasks = [
      { ...paper.writing, kind: "writing" as const },
      ...paper.speaking.map((s) => ({ ...s, kind: "speaking" as const })),
    ];
    try {
      await Promise.all(
        tasks.map(async (task) => {
          const r = responses[task.id];
          const text = r?.type === "text" ? r.value : "";
          if (!text.trim()) {
            grades[task.id] = { score: 0 };
            return;
          }
          const g = await ai.gradeProductive({
            kind: task.kind,
            target: learner.targetLanguage,
            native: user.nativeLanguage,
            level: "A1",
            task: task.prompt.en ?? Object.values(task.prompt)[0] ?? "",
            contentPoints: task.contentPoints,
            rubric: RUBRICS[task.kind],
            response: text,
            typed: r?.type === "text" ? r.typed : undefined,
            seconds: r?.type === "text" ? r.seconds : undefined,
          });
          grades[task.id] = { score: rubricScore(g.criteria), criteria: g.criteria, feedback: g.feedback };
          feedback.productive![task.id] = { criteria: g.criteria, feedback: g.feedback, response: text };
          feedback.toWorkOn.push(...g.toWorkOn);
          void store.logUsage({
            userId: user.id, sessionId: null, kind: "grading", provider: ai.name,
            model: g.usage.model, inputTokens: g.usage.inputTokens, outputTokens: g.usage.outputTokens,
          }).catch(() => {});
        }),
      );
    } catch (err) {
      console.error("grading failed", err);
      return NextResponse.json({ error: "grading_failed" }, { status: 502 });
    }
  }

  const result = computeResult(attempt.kind, content.sections, grades);
  feedback.weakSkills = attempt.kind !== "levelup" ? [] : (Object.entries(result.perSkill) as [ExamSkill, number][])
    .filter(([, v]) => v < 0.5)
    .map(([k]) => k);

  // Check-in weak spots: missed words go back into the review queue now.
  if (attempt.kind === "checkin") {
    for (const item of items) {
      if ((grades[item.id]?.score ?? 0) >= 1) continue;
      if (item.type === "choice") {
        const term = item.promptLang === learner.targetLanguage ? item.prompt || item.audio : item.options[item.answer];
        const meaning = item.promptLang === learner.targetLanguage ? item.options[item.answer] : item.prompt;
        feedback.toWorkOn.push(`${term || item.audio} — ${meaning}`);
      } else if (item.type === "order") {
        feedback.toWorkOn.push(item.answer.join(" "));
      }
      const vocabId = item.type === "choice" || item.type === "order" ? item.vocabId : undefined;
      if (vocabId) {
        const v = await store.getVocabItem(learner.id, vocabId);
        if (v) await store.updateVocabSchedule(learner.id, v.id, lapse(v));
      }
    }
  }

  await store.updateAttempt(id, {
    status: "graded",
    content: { ...content, grades },
    overall: result.overall,
    perSkill: result.perSkill,
    passed: result.passed,
    feedback,
    completedAt: new Date().toISOString(),
  });
  if (attempt.kind === "levelup" && result.passed) await store.setLevel(learner.id, "A1");

  return NextResponse.json({ status: "graded" });
}
