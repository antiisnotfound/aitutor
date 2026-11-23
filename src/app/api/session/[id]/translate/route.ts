import { NextResponse } from "next/server";
import { z } from "zod";
import { getAiProvider } from "@/lib/ai";
import { getStore } from "@/lib/data/store";
import { getCurrentUser } from "@/lib/user";

const Body = z.object({ text: z.string().min(1).max(600) });

/** Caption translation for one tutor line (target → learner's native language). */
export async function POST(req: Request, ctx: RouteContext<"/api/session/[id]/translate">) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  const learner = user?.learner;
  if (!user || !learner) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const store = await getStore();
  const session = await store.getSession(id, user.id);
  if (!session || session.status !== "active") return NextResponse.json({ error: "not_found" }, { status: 404 });

  try {
    const ai = getAiProvider();
    const { text, usage } = await ai.translate(parsed.data.text, learner.targetLanguage, user.nativeLanguage);
    void store.logUsage({
      userId: user.id, sessionId: id, kind: "translate", provider: ai.name,
      model: usage.model, inputTokens: usage.inputTokens, outputTokens: usage.outputTokens,
    }).catch(() => {});
    return NextResponse.json({ translation: text });
  } catch (err) {
    console.error("translate failed", err);
    return NextResponse.json({ translation: "" });
  }
}
