import "server-only";
import { readDemo, writeDemo } from "@/lib/demo";
import type { NewWord } from "@/lib/session/types";
import type { SkillStatus } from "@/lib/types";
import { mergeStatus, type LearningStore, type StoredSession } from "./store";

/**
 * Demo-mode store: lives in the dev server's memory (lost on restart).
 * Kept on globalThis so hot reloads don't wipe it.
 */
type Vocab = NewWord & { sessionId: string; dueAt: number };
type Mem = {
  sessions: Map<string, StoredSession>;
  skills: Map<string, Map<string, SkillStatus>>;
  vocab: Map<string, Vocab[]>;
};
const g = globalThis as unknown as { __demoStore?: Mem };
const mem: Mem = (g.__demoStore ??= { sessions: new Map(), skills: new Map(), vocab: new Map() });

const DAY = 86_400_000;

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

  async addVocabulary(learnerId, sessionId, words) {
    const list = mem.vocab.get(learnerId) ?? [];
    for (const w of words) {
      if (list.some((v) => v.kind === w.kind && v.term.toLowerCase() === w.term.toLowerCase())) continue;
      list.push({ ...w, sessionId, dueAt: Date.now() + DAY });
    }
    mem.vocab.set(learnerId, list);
  },

  async markPlacementDone() {
    const demo = await readDemo();
    if (demo?.learner) await writeDemo({ ...demo, learner: { ...demo.learner, placementDone: true } });
  },

  async vocabularyStats(learnerId) {
    const list = mem.vocab.get(learnerId) ?? [];
    return { total: list.length, due: list.filter((v) => v.dueAt <= Date.now()).length };
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
};
