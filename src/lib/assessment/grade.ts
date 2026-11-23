import { ASSESSMENT } from "@/config/app";
import type { AttemptContent, AttemptResult, ExamSkill, ItemGrade, Section } from "./types";

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/** Auto-scores choice and ordering items (1 or 0). Productive items are graded elsewhere. */
export function gradeObjective(content: AttemptContent): Record<string, ItemGrade> {
  const grades: Record<string, ItemGrade> = {};
  for (const section of content.sections) {
    for (const item of section.items) {
      const r = content.responses[item.id];
      if (item.type === "choice") {
        grades[item.id] = { score: r?.type === "choice" && r.value === item.answer ? 1 : 0 };
      } else if (item.type === "order") {
        const ok = r?.type === "order" && r.value.length === item.answer.length && r.value.every((c, i) => norm(c) === norm(item.answer[i]));
        grades[item.id] = { score: ok ? 1 : 0 };
      }
    }
  }
  return grades;
}

/** Rubric criteria (0–4 each) → 0–1. */
export function rubricScore(criteria: Record<string, number>): number {
  const vals = Object.values(criteria);
  if (!vals.length) return 0;
  return vals.reduce((a, b) => a + Math.max(0, Math.min(4, b)), 0) / (vals.length * 4);
}

/**
 * Per-skill and overall scores. Each skill is the mean of its items.
 * Level-up pass rule: overall ≥ 70 % and no skill below 50 % (configurable).
 */
export function computeResult(kind: "checkin" | "levelup", sections: Section[], grades: Record<string, ItemGrade>): Omit<AttemptResult, "toWorkOn"> {
  const bySkill = new Map<ExamSkill, number[]>();
  for (const s of sections) {
    for (const i of s.items) {
      const list = bySkill.get(i.skill) ?? [];
      list.push(grades[i.id]?.score ?? 0);
      bySkill.set(i.skill, list);
    }
  }
  const perSkill: Partial<Record<ExamSkill, number>> = {};
  for (const [skill, scores] of bySkill) perSkill[skill] = round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const skills = Object.values(perSkill);
  const all = [...bySkill.values()].flat();
  // Exam: skills weigh equally (like the big exams). Check-in: plain share of correct answers.
  const overall =
    kind === "levelup"
      ? round(skills.reduce((a, b) => a + b, 0) / (skills.length || 1))
      : round(all.reduce((a, b) => a + b, 0) / (all.length || 1));
  const rule = ASSESSMENT.levelUpPass;
  const passed = kind === "levelup" ? overall >= rule.overall && skills.every((v) => v >= rule.minPerSkill) : null;
  return { overall, perSkill, passed };
}

const round = (n: number) => Math.round(n * 1000) / 1000;
