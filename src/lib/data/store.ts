import "server-only";
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
  kind: "realtime" | "summary" | "translate";
  provider: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  inputAudioTokens?: number;
  outputAudioTokens?: number;
  audioSeconds?: number;
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
}

export async function getStore(): Promise<LearningStore> {
  return (await readDemo()) ? memoryStore : supabaseStore;
}

/** Never let a skill go backwards, and keep the strongest evidence. */
export function mergeStatus(current: SkillStatus | undefined, next: "practising" | "mastered"): SkillStatus {
  return current === "mastered" ? "mastered" : next;
}
