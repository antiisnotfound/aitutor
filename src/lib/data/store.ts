import "server-only";
import type { AttemptContent, ExamSkill } from "@/lib/assessment/types";
import type { CefrLevel } from "@/config/learning";
import type { HiddenGoal, NewWord, SessionEvent, SessionSummary, TranscriptTurn } from "@/lib/session/types";
import type { SkillStatus } from "@/lib/types";
import { readDemo } from "@/lib/demo";
import { memoryStore } from "./memory";
import { supabaseStore } from "./supabase";

export type StoredSession = {
  id: string;
  userId: string;
  learnerId: string;
  mode: "placement" | "practice";
  status: "active" | "completed" | "abandoned";
  plannedMinutes: number | null;
  hiddenGoal: HiddenGoal;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  transcript: TranscriptTurn[];
  events: SessionEvent[];
  summary: SessionSummary | null;
};

export type UsageEntry = {
  userId: string;
  sessionId: string | null;
  kind: "realtime" | "summary" | "translate" | "transcribe" | "grading";
  provider: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  inputAudioTokens?: number;
  outputAudioTokens?: number;
  audioSeconds?: number;
};

export type VocabItem = NewWord & {
  id: string;
  dueAt: string;
  intervalDays: number;
  ease: number;
  reps: number;
  lapses: number;
  createdAt: string;
};

export type SrsState = Pick<VocabItem, "dueAt" | "intervalDays" | "ease" | "reps" | "lapses">;

export type AttemptFeedback = {
  toWorkOn: string[];
  weakSkills: ExamSkill[];
  /** Writing/speaking: rubric scores and examiner comment per item. */
  productive?: Record<string, { criteria: Record<string, number>; feedback: string; response: string }>;
};

export type StoredAttempt = {
  id: string;
  userId: string;
  learnerId: string;
  kind: "checkin" | "levelup";
  level: CefrLevel;
  status: "in_progress" | "graded" | "abandoned";
  content: AttemptContent;
  overall: number | null;
  perSkill: Partial<Record<ExamSkill, number>> | null;
  passed: boolean | null;
  feedback: AttemptFeedback | null;
  startedAt: string;
  completedAt: string | null;
};

/** Persistence for the learning loop. Supabase in real use, memory in demo mode. */
export interface LearningStore {
  getSkillMap(learnerId: string): Promise<Record<string, SkillStatus>>;
  recentSessions(learnerId: string, limit: number): Promise<StoredSession[]>;
  createSession(s: Pick<StoredSession, "userId" | "learnerId" | "mode" | "plannedMinutes" | "hiddenGoal">): Promise<StoredSession>;
  /** Returns the session only if it belongs to `userId`. */
  getSession(id: string, userId: string): Promise<StoredSession | null>;
  finishSession(
    id: string,
    data: Pick<StoredSession, "status" | "durationSeconds" | "transcript" | "events" | "summary">,
  ): Promise<void>;
  applySkillUpdates(learnerId: string, sessionId: string, updates: SessionSummary["candoUpdates"]): Promise<void>;
  addVocabulary(learnerId: string, sessionId: string, words: NewWord[]): Promise<void>;
  markPlacementDone(learnerId: string): Promise<void>;
  vocabularyStats(learnerId: string): Promise<{ total: number; due: number }>;
  /** Start times of completed sessions in the last `days` days. */
  completedSessionTimes(learnerId: string, days: number): Promise<string[]>;
  logUsage(entry: UsageEntry): Promise<void>;

  // --- vocabulary review
  /** Due items first (oldest due first); with `includeUpcoming`, then the soonest upcoming. */
  reviewQueue(learnerId: string, limit: number, includeUpcoming: boolean): Promise<VocabItem[]>;
  recentVocabulary(learnerId: string, limit: number): Promise<VocabItem[]>;
  /** Returns the item only if it belongs to the learner. */
  getVocabItem(learnerId: string, id: string): Promise<VocabItem | null>;
  updateVocabSchedule(learnerId: string, id: string, state: SrsState): Promise<void>;

  // --- assessments
  createAttempt(a: Pick<StoredAttempt, "userId" | "learnerId" | "kind" | "level" | "content">): Promise<StoredAttempt>;
  /** Full attempt incl. answers (server only); only if it belongs to `userId`. */
  getAttempt(id: string, userId: string): Promise<StoredAttempt | null>;
  updateAttempt(id: string, patch: Partial<Pick<StoredAttempt, "status" | "content" | "overall" | "perSkill" | "passed" | "feedback" | "completedAt">>): Promise<void>;
  lastAttempt(learnerId: string, kind: StoredAttempt["kind"], status?: StoredAttempt["status"]): Promise<StoredAttempt | null>;
  setLevel(learnerId: string, level: CefrLevel): Promise<void>;
}

export async function getStore(): Promise<LearningStore> {
  return (await readDemo()) ? memoryStore : supabaseStore;
}

/** Never let a skill go backwards, and keep the strongest evidence. */
export function mergeStatus(current: SkillStatus | undefined, next: "practising" | "mastered"): SkillStatus {
  return current === "mastered" ? "mastered" : next;
}
