import "server-only";
import { readDemo, writeDemo } from "@/lib/demo";
import type { SkillStatus } from "@/lib/types";
import { mergeStatus, type LearningStore, type StoredAttempt, type StoredSession, type VocabItem } from "./store";

/**
 * Demo-mode store: lives in the dev server's memory (lost on restart).
 * Kept on globalThis so hot reloads don't wipe it.
 */
type Mem = {
  sessions: Map<string, StoredSession>;
  skills: Map<string, Map<string, SkillStatus>>;
  vocab: Map<string, VocabItem[]>;
  attempts: Map<string, StoredAttempt>;
};
const g = globalThis as unknown as { __demoStore?: Mem };
const mem: Mem = (g.__demoStore ??= { sessions: new Map(), skills: new Map(), vocab: new Map(), attempts: new Map() });
// Upgrade demo data created by earlier versions (dev server kept running).
mem.attempts ??= new Map();
for (const list of mem.vocab.values()) {
  for (const v of list as Partial<VocabItem>[]) {
    v.id ??= crypto.randomUUID();
    v.createdAt ??= new Date().toISOString();
    v.dueAt = typeof v.dueAt === "number" ? new Date(v.dueAt).toISOString() : (v.dueAt ?? new Date().toISOString());
    v.intervalDays ??= 1;
    v.ease ??= 2.5;
    v.reps ??= 0;
    v.lapses ??= 0;
  }
}

const DAY = 86_400_000;
const byDue = (a: VocabItem, b: VocabItem) => a.dueAt.localeCompare(b.dueAt);

export const memoryStore: LearningStore = {
  async getSkillMap(learnerId) {
    return Object.fromEntries(mem.skills.get(learnerId) ?? []);
  },

  async recentSessions(learnerId, limit) {
    return [...mem.sessions.values()]
      .filter((s) => s.learnerId === learnerId && s.status === "completed")
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .slice(0, limit);
  },

  async createSession(s) {
    const session: StoredSession = {
      ...s,
      id: crypto.randomUUID(),
      status: "active",
      startedAt: new Date().toISOString(),
      endedAt: null,
      durationSeconds: null,
      transcript: [],
      events: [],
      summary: null,
    };
    mem.sessions.set(session.id, session);
    return session;
  },

  async getSession(id, userId) {
    const s = mem.sessions.get(id);
    return s && s.userId === userId ? s : null;
  },

  async finishSession(id, data) {
    const s = mem.sessions.get(id);
    if (s) mem.sessions.set(id, { ...s, ...data, endedAt: new Date().toISOString() });
  },

  async applySkillUpdates(learnerId, _sessionId, updates) {
    const map = mem.skills.get(learnerId) ?? new Map<string, SkillStatus>();
    for (const u of updates) map.set(u.candoId, mergeStatus(map.get(u.candoId), u.status));
    mem.skills.set(learnerId, map);
  },

  async addVocabulary(learnerId, _sessionId, words) {
    const list = mem.vocab.get(learnerId) ?? [];
    const now = Date.now();
    for (const w of words) {
      if (list.some((v) => v.kind === w.kind && v.term.toLowerCase() === w.term.toLowerCase())) continue;
      list.push({
        ...w,
        id: crypto.randomUUID(),
        dueAt: new Date(now + DAY).toISOString(),
        intervalDays: 1,
        ease: 2.5,
        reps: 0,
        lapses: 0,
        createdAt: new Date(now).toISOString(),
      });
    }
    mem.vocab.set(learnerId, list);
  },

  async markPlacementDone() {
    const demo = await readDemo();
    if (demo?.learner) await writeDemo({ ...demo, learner: { ...demo.learner, placementDone: true } });
  },

  async vocabularyStats(learnerId) {
    const list = mem.vocab.get(learnerId) ?? [];
    const now = new Date().toISOString();
    return { total: list.length, due: list.filter((v) => v.dueAt <= now).length };
  },

  async completedSessionTimes(learnerId, days) {
    const since = Date.now() - days * DAY;
    return [...mem.sessions.values()]
      .filter((s) => s.learnerId === learnerId && s.status === "completed" && Date.parse(s.startedAt) >= since)
      .map((s) => s.startedAt);
  },

  async logUsage() {
    /* not tracked in demo mode */
  },

  // ------------------------------------------------------------ vocabulary
  async reviewQueue(learnerId, limit, includeUpcoming) {
    const now = new Date().toISOString();
    const list = [...(mem.vocab.get(learnerId) ?? [])].sort(byDue);
    const due = list.filter((v) => v.dueAt <= now);
    const rest = includeUpcoming ? list.filter((v) => v.dueAt > now) : [];
    return [...due, ...rest].slice(0, limit);
  },

  async recentVocabulary(learnerId, limit) {
    return [...(mem.vocab.get(learnerId) ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
  },

  async getVocabItem(learnerId, id) {
    return mem.vocab.get(learnerId)?.find((v) => v.id === id) ?? null;
  },

  async updateVocabSchedule(learnerId, id, state) {
    const item = mem.vocab.get(learnerId)?.find((v) => v.id === id);
    if (item) Object.assign(item, state);
  },

  // ------------------------------------------------------------ assessments
  async createAttempt(a) {
    const attempt: StoredAttempt = {
      ...a,
      id: crypto.randomUUID(),
      status: "in_progress",
      overall: null,
      perSkill: null,
      passed: null,
      feedback: null,
      startedAt: new Date().toISOString(),
      completedAt: null,
    };
    mem.attempts.set(attempt.id, attempt);
    return attempt;
  },

  async getAttempt(id, userId) {
    const a = mem.attempts.get(id);
    return a && a.userId === userId ? a : null;
  },

  async updateAttempt(id, patch) {
    const a = mem.attempts.get(id);
    if (a) mem.attempts.set(id, { ...a, ...patch });
  },

  async lastAttempt(learnerId, kind, status) {
    return (
      [...mem.attempts.values()]
        .filter((a) => a.learnerId === learnerId && a.kind === kind && (!status || a.status === status))
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0] ?? null
    );
  },

  async setLevel(_learnerId, level) {
    const demo = await readDemo();
    if (demo?.learner) await writeDemo({ ...demo, learner: { ...demo.learner, level } });
  },
};
