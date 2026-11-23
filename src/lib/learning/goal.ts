import { A1_CANDOS } from "@/content/cefr-a1";
import type { Skill } from "@/config/learning";
import type { HiddenGoal } from "@/lib/session/types";
import type { SkillStatus } from "@/lib/types";

/** Skills a free conversation can actually practise. */
const CONVERSATION_SKILLS: Skill[] = ["speaking", "listening"];

/**
 * Picks the hidden goal for the next conversation from the skill map,
 * the learner's focus skills and what recent sessions flagged to revisit.
 */
export function pickHiddenGoal(opts: {
  mode: "placement" | "practice";
  skillMap: Record<string, SkillStatus>;
  focusSkills: Skill[];
  recentKeepInMind: string[];
}): HiddenGoal {
  const conversational = A1_CANDOS.filter((c) => CONVERSATION_SKILLS.includes(c.skill));

  if (opts.mode === "placement") {
    return {
      candoIds: conversational.map((c) => c.id),
      focus:
        "Placement: find out which of these the learner can already do, starting very simply and gently trying slightly harder things.",
      review: [],
    };
  }

  const status = (id: string) => opts.skillMap[id] ?? "not_seen";
  const preferred = (skill: Skill) => (opts.focusSkills.includes(skill) ? 0 : 1);
  const open = conversational
    .filter((c) => status(c.id) !== "mastered")
    .sort(
      (a, b) =>
        // keep practising before starting new things, then the learner's focus skills
        Number(status(a.id) === "not_seen") - Number(status(b.id) === "not_seen") ||
        preferred(a.skill) - preferred(b.skill),
    );

  const chosen = (open.length ? open : conversational).slice(0, 2);
  return {
    candoIds: chosen.map((c) => c.id),
    focus: chosen.map((c) => c.label.en).join("; "),
    review: opts.recentKeepInMind.slice(0, 3),
  };
}
