import { NextResponse } from "next/server";
import { z } from "zod";
import { buildCheckin, buildLevelUp } from "@/lib/assessment/build";
import { assessmentStatus } from "@/lib/assessment/status";
import { toPublic } from "@/lib/assessment/types";
import { getStore } from "@/lib/data/store";
import { getCurrentUser } from "@/lib/user";

const Body = z.object({ kind: z.enum(["checkin", "levelup"]) });

/** Builds a quiz/exam on the server (answers stay here) and returns the questions. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  const learner = user?.learner;
  if (!user || !learner) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const { kind } = parsed.data;

  const store = await getStore();
  if (kind === "levelup") {
    const status = (await assessmentStatus(learner)).levelUp;
    if (status.state !== "available") return NextResponse.json({ error: "not_available", status }, { status: 403 });
  }

  const sections =
    kind === "checkin"
      ? buildCheckin({ target: learner.targetLanguage, native: user.nativeLanguage, vocab: await store.recentVocabulary(learner.id, 30) })
      : buildLevelUp({ target: learner.targetLanguage, native: user.nativeLanguage });

  const attempt = await store.createAttempt({
    userId: user.id,
    learnerId: learner.id,
    kind,
    level: "A1",
    content: { sections, responses: {} },
  });
  return NextResponse.json({ attemptId: attempt.id, kind, sections: toPublic(sections) }, { headers: { "Cache-Control": "no-store" } });
}
