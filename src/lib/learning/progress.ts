import { A1_CANDOS, type CanDo } from "@/content/cefr-a1";
import { nextLevel, type CefrLevel } from "@/config/learning";
import type { SkillStatus } from "@/lib/types";

/** Can-dos of the level the learner is working towards (MVP: A1 only). */
export function candosFor(level: CefrLevel): CanDo[] {
  return nextLevel(level) === "A1" ? A1_CANDOS : [];
}

/** Share of the next level's can-dos mastered, plus the next few to practise. */
export function levelProgress(level: CefrLevel, map: Record<string, SkillStatus>) {
  const candos = candosFor(level);
  const mastered = candos.filter((c) => map[c.id] === "mastered").length;
  const upNext = [
    ...candos.filter((c) => map[c.id] === "practising"),
    ...candos.filter((c) => !map[c.id] || map[c.id] === "not_seen"),
  ];
  return {
    target: nextLevel(level),
    total: candos.length,
    mastered,
    progress: candos.length ? mastered / candos.length : 0,
    upNext,
  };
}
