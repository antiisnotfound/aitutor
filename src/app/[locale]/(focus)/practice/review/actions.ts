"use server";

import { z } from "zod";
import { getStore } from "@/lib/data/store";
import { schedule } from "@/lib/learning/srs";
import { getCurrentUser } from "@/lib/user";

const Input = z.object({ id: z.string().min(1).max(64), grade: z.enum(["again", "hard", "good", "easy"]) });

/** Records one flashcard rating and reschedules the word. */
export async function gradeCard(input: z.input<typeof Input>): Promise<{ ok: boolean; requeue: boolean }> {
  const parsed = Input.safeParse(input);
  const learner = (await getCurrentUser())?.learner;
  if (!parsed.success || !learner) return { ok: false, requeue: false };

  const store = await getStore();
  const item = await store.getVocabItem(learner.id, parsed.data.id);
  if (!item) return { ok: false, requeue: false };
  await store.updateVocabSchedule(learner.id, item.id, schedule(item, parsed.data.grade));
  // "Again" cards come back once more at the end of this round.
  return { ok: true, requeue: parsed.data.grade === "again" };
}
