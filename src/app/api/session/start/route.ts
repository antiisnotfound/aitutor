import { NextResponse } from "next/server";
import { z } from "zod";
import { SESSION } from "@/config/app";
import { getAiProvider } from "@/lib/ai";
import { getStore } from "@/lib/data/store";
import { pickHiddenGoal } from "@/lib/learning/goal";
import { tutorContext } from "@/lib/session/context";
import type { StartSessionResponse } from "@/lib/session/types";
import { getCurrentUser } from "@/lib/user";

const Body = z.object({ plannedMinutes: z.literal(SESSION.defaultMinutes).nullable() });

/** Picks the hidden goal, records the session and mints a realtime credential. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  const learner = user?.learner;
  if (!user || !learner) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  try {
    const store = await getStore();
    const [skillMap, recent, lastCheckin] = await Promise.all([
      store.getSkillMap(learner.id),
      store.recentSessions(learner.id, 3),
      store.lastAttempt(learner.id, "checkin", "graded"),
    ]);
    const mode = learner.placementDone ? "practice" : "placement";
    const hiddenGoal = pickHiddenGoal({
      mode,
      skillMap,
      focusSkills: learner.focusSkills,
      // Weak spots from the latest check-in quiz come first, then recent session tips.
      recentKeepInMind: [
        ...(lastCheckin?.feedback?.toWorkOn ?? []).slice(0, 2).map((w) => `the word/phrase "${w}"`),
        ...recent.flatMap((s) => s.summary?.keepInMind ?? []),
      ],
    });

    const session = await store.createSession({
      userId: user.id,
      learnerId: learner.id,
      mode,
      plannedMinutes: parsed.data.plannedMinutes,
      hiddenGoal,
    });

    const ctx = tutorContext(user, learner, session);
    const ai = getAiProvider();
    const rt = await ai.createRealtimeSession(ctx);

    const body: StartSessionResponse = {
      sessionId: session.id,
      provider: ai.name,
      model: rt.model,
      clientSecret: rt.clientSecret,
      mode,
      plannedMinutes: session.plannedMinutes,
      hardCapMinutes: SESSION.hardCapMinutes,
      tutor: { name: ctx.tutorName, gender: learner.tutorGender },
      target: learner.targetLanguage,
      native: user.nativeLanguage,
    };
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("session/start failed", err);
    return NextResponse.json({ error: "start_failed" }, { status: 500 });
  }
}
