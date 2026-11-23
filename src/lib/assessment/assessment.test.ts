import { describe, expect, it } from "vitest";
import type { StoredAttempt, VocabItem } from "@/lib/data/store";
import { checkinStatus, levelUpStatus } from "./availability";
import { buildCheckin, buildLevelUp, chunkPhrase } from "./build";
import { computeResult, gradeObjective, rubricScore } from "./grade";
import { toPublic, type AttemptContent } from "./types";

// Deterministic RNG for repeatable tests.
const seeded = (seed = 42) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

const vocab = (term: string, translation: string, kind: "word" | "phrase" = "word"): VocabItem => ({
  id: `v-${term}`, kind, term, translation, dueAt: "", intervalDays: 1, ease: 2.5, reps: 0, lapses: 0, createdAt: "",
});

describe("buildCheckin", () => {
  it("makes 10 questions across reading, listening and writing for a new learner", () => {
    const sections = buildCheckin({ target: "it", native: "sq", vocab: [], rng: seeded() });
    const items = sections.flatMap((s) => s.items);
    expect(items).toHaveLength(10);
    expect(new Set(items.map((i) => i.skill))).toEqual(new Set(["reading", "listening", "writing"]));
    for (const i of items) {
      if (i.type === "choice") {
        expect(i.options).toHaveLength(4);
        expect(new Set(i.options).size).toBe(4);
        expect(i.answer).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("asks about the learner's own words first and links them for weak spots", () => {
    const sections = buildCheckin({ target: "it", native: "sq", vocab: [vocab("la pesca", "pjeshka")], rng: seeded() });
    const first = sections[0].items[0];
    expect(first.type === "choice" && first.prompt).toBe("la pesca");
    expect(first.type === "choice" && first.vocabId).toBe("v-la pesca");
  });

  it("uses a saved phrase for the ordering question", () => {
    const sections = buildCheckin({
      target: "it", native: "sq", rng: seeded(),
      vocab: [vocab("Sono andato al mercato", "Shkova në treg", "phrase")],
    });
    const order = sections.flatMap((s) => s.items).find((i) => i.type === "order")!;
    expect(order.type === "order" && order.answer).toEqual(["Sono", "andato", "al", "mercato"]);
    expect(order.type === "order" && order.chunks.join(" ")).not.toBe("Sono andato al mercato");
  });
});

describe("chunkPhrase", () => {
  it("keeps short phrases word by word and groups long ones into ≤5 chunks", () => {
    expect(chunkPhrase("I went home.")).toEqual(["I", "went", "home"]);
    expect(chunkPhrase("one two three four five six seven eight").length).toBeLessThanOrEqual(5);
  });
});

describe("toPublic", () => {
  it("never sends answers to the browser", () => {
    const pub = toPublic(buildLevelUp({ target: "en", native: "it" }));
    for (const i of pub.flatMap((s) => s.items)) {
      if (i.type === "choice") expect(i.answer).toBe(-1);
      if (i.type === "order") expect(i.answer).toEqual([]);
    }
  });
});

describe("grading", () => {
  const sections = buildLevelUp({ target: "it", native: "sq" });
  const allRight = (): AttemptContent => {
    const responses: AttemptContent["responses"] = {};
    for (const i of sections.flatMap((s) => s.items)) if (i.type === "choice") responses[i.id] = { type: "choice", value: i.answer };
    return { sections, responses };
  };

  it("scores objective items", () => {
    const g = gradeObjective(allRight());
    expect(Object.values(g).every((x) => x.score === 1)).toBe(true);
  });

  it("applies the pass rule: ≥70 % overall and no skill under 50 %", () => {
    const g = gradeObjective(allRight());
    const withProductive = (w: number, s1: number, s2: number) => ({ ...g, w1: { score: w }, s1: { score: s1 }, s2: { score: s2 } });

    const pass = computeResult("levelup", sections, withProductive(0.75, 0.75, 0.75));
    expect(pass.passed).toBe(true);
    expect(pass.perSkill).toEqual({ reading: 1, listening: 1, writing: 0.75, speaking: 0.75 });

    // High overall but speaking below 50 % → fail.
    const weakSpeaking = computeResult("levelup", sections, withProductive(1, 0.25, 0.5));
    expect(weakSpeaking.overall).toBeGreaterThan(0.7);
    expect(weakSpeaking.passed).toBe(false);
  });

  it("check-ins have no pass/fail and score the share of correct answers", () => {
    const quiz = buildCheckin({ target: "it", native: "sq", vocab: [], rng: seeded() });
    const ids = quiz.flatMap((s) => s.items).map((i) => i.id);
    const grades = Object.fromEntries(ids.map((id, n) => [id, { score: n < 4 ? 1 : 0 }]));
    const r = computeResult("checkin", quiz, grades);
    expect(r.passed).toBeNull();
    expect(r.overall).toBe(0.4);
  });

  it("rubric criteria map 0–4 → 0–1", () => {
    expect(rubricScore({ a: 4, b: 2, c: 2, d: 0 })).toBe(0.5);
  });
});

describe("availability", () => {
  const now = Date.parse("2026-11-23T12:00:00Z");
  const attempt = (p: Partial<StoredAttempt>): StoredAttempt => ({
    id: "a1", userId: "u", learnerId: "l", kind: "levelup", level: "A1", status: "graded",
    content: { sections: [], responses: {} }, overall: 0.6, perSkill: {}, passed: false, feedback: null,
    startedAt: "2026-11-22T12:00:00Z", completedAt: "2026-11-22T12:00:00Z", ...p,
  });

  it("first check-in is due immediately, then every 14 days", () => {
    expect(checkinStatus(null, now).due).toBe(true);
    const s = checkinStatus(attempt({ kind: "checkin", completedAt: "2026-11-20T12:00:00Z" }), now);
    expect(s).toMatchObject({ due: false, dueInDays: 11 });
  });

  it("level-up exam locks until enough can-dos are mastered", () => {
    expect(levelUpStatus({ last: null, progress: 0.2, now }).state).toBe("locked");
    expect(levelUpStatus({ last: null, progress: 0.6, now }).state).toBe("available");
  });

  it("a failed exam can be retaken after the cooldown", () => {
    expect(levelUpStatus({ last: attempt({}), progress: 1, now })).toMatchObject({ state: "cooldown", availableInDays: 2 });
    expect(levelUpStatus({ last: attempt({ completedAt: "2026-11-19T12:00:00Z" }), progress: 1, now }).state).toBe("available");
  });

  it("a passed exam stays passed", () => {
    expect(levelUpStatus({ last: attempt({ passed: true }), progress: 0, now }).state).toBe("passed");
  });
});
