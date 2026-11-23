import "server-only";
import type { SkillStatus } from "@/lib/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { mergeStatus, type LearningStore, type StoredSession } from "./store";

/** Reads go through the user's client (RLS); trusted writes use the secret key. */
async function userDb() {
  const db = await createClient();
  if (!db) throw new Error("Supabase is not configured");
  return db;
}

type SessionRow = {
  id: string; user_id: string; learner_profile_id: string; mode: StoredSession["mode"];
  status: StoredSession["status"]; planned_minutes: number | null; hidden_goal: StoredSession["hiddenGoal"];
  started_at: string; ended_at: string | null; duration_seconds: number | null;
  transcript: StoredSession["transcript"]; events: StoredSession["events"]; summary: StoredSession["summary"];
};

const toSession = (r: SessionRow): StoredSession => ({
  id: r.id, userId: r.user_id, learnerId: r.learner_profile_id, mode: r.mode, status: r.status,
  plannedMinutes: r.planned_minutes, hiddenGoal: r.hidden_goal, startedAt: r.started_at,
  endedAt: r.ended_at, durationSeconds: r.duration_seconds, transcript: r.transcript ?? [],
  events: r.events ?? [], summary: r.summary,
});

const SESSION_COLS =
  "id, user_id, learner_profile_id, mode, status, planned_minutes, hidden_goal, started_at, ended_at, duration_seconds, transcript, events, summary";

export const supabaseStore: LearningStore = {
  async getSkillMap(learnerId) {
    const { data } = await (await userDb())
      .from("skill_map_entries").select("cando_id, status").eq("learner_profile_id", learnerId);
    return Object.fromEntries((data ?? []).map((r) => [r.cando_id, r.status as SkillStatus]));
  },

  async recentSessions(learnerId, limit) {
    const { data } = await (await userDb())
      .from("sessions").select(SESSION_COLS)
      .eq("learner_profile_id", learnerId).eq("status", "completed")
      .order("started_at", { ascending: false }).limit(limit);
    return (data as SessionRow[] | null ?? []).map(toSession);
  },

  async createSession(s) {
    const { data, error } = await createAdminClient()
      .from("sessions")
      .insert({
        user_id: s.userId, learner_profile_id: s.learnerId, mode: s.mode,
        planned_minutes: s.plannedMinutes, hidden_goal: s.hiddenGoal,
      })
      .select(SESSION_COLS).single();
    if (error) throw error;
    return toSession(data as SessionRow);
  },

  async getSession(id, userId) {
    const { data } = await (await userDb())
      .from("sessions").select(SESSION_COLS).eq("id", id).eq("user_id", userId).maybeSingle();
    return data ? toSession(data as SessionRow) : null;
  },

  async finishSession(id, d) {
    const { error } = await createAdminClient().from("sessions").update({
      status: d.status, ended_at: new Date().toISOString(), duration_seconds: d.durationSeconds,
      transcript: d.transcript, events: d.events, summary: d.summary,
    }).eq("id", id);
    if (error) throw error;
  },

  async applySkillUpdates(learnerId, sessionId, updates) {
    if (!updates.length) return;
    const admin = createAdminClient();
    const { data: existing } = await admin
      .from("skill_map_entries").select("cando_id, status, evidence")
      .eq("learner_profile_id", learnerId)
      .in("cando_id", updates.map((u) => u.candoId));
    const byId = new Map((existing ?? []).map((r) => [r.cando_id as string, r]));
    const now = new Date().toISOString();
    const rows = updates.map((u) => {
      const cur = byId.get(u.candoId);
      return {
        learner_profile_id: learnerId,
        cando_id: u.candoId,
        status: mergeStatus(cur?.status as SkillStatus | undefined, u.status),
        evidence: [...((cur?.evidence as unknown[]) ?? []), { sessionId, note: u.note, at: now }].slice(-20),
        updated_at: now,
      };
    });
    const { error } = await admin.from("skill_map_entries").upsert(rows);
    if (error) throw error;
  },

  async addVocabulary(learnerId, sessionId, words) {
    if (!words.length) return;
    const admin = createAdminClient();
    // Skip terms already in the queue (case-insensitive unique index).
    const { data: existing } = await admin
      .from("vocabulary_items").select("kind, term").eq("learner_profile_id", learnerId);
    const seen = new Set((existing ?? []).map((r) => `${r.kind}:${String(r.term).toLowerCase()}`));
    const rows = words
      .filter((w) => {
        const key = `${w.kind}:${w.term.toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((w) => ({
        learner_profile_id: learnerId, kind: w.kind, term: w.term, translation: w.translation,
        note: w.note ?? null, source_session_id: sessionId,
      }));
    if (!rows.length) return;
    const { error } = await admin.from("vocabulary_items").insert(rows);
    if (error) throw error;
  },

  async markPlacementDone(learnerId) {
    const { error } = await createAdminClient()
      .from("learner_profiles").update({ placement_done: true }).eq("id", learnerId);
    if (error) throw error;
  },

  async vocabularyStats(learnerId) {
    const db = await userDb();
    const [{ count: total }, { count: due }] = await Promise.all([
      db.from("vocabulary_items").select("id", { count: "exact", head: true }).eq("learner_profile_id", learnerId),
      db.from("vocabulary_items").select("id", { count: "exact", head: true })
        .eq("learner_profile_id", learnerId).lte("due_at", new Date().toISOString()),
    ]);
    return { total: total ?? 0, due: due ?? 0 };
  },

  async completedSessionTimes(learnerId, days) {
    const since = new Date(Date.now() - days * 86_400_000).toISOString();
    const { data } = await (await userDb())
      .from("sessions").select("started_at")
      .eq("learner_profile_id", learnerId).eq("status", "completed").gte("started_at", since);
    return (data ?? []).map((r) => r.started_at as string);
  },

  async logUsage(e) {
    await createAdminClient().from("ai_usage").insert({
      user_id: e.userId, session_id: e.sessionId, kind: e.kind, provider: e.provider, model: e.model,
      input_tokens: e.inputTokens ?? 0, output_tokens: e.outputTokens ?? 0,
      input_audio_tokens: e.inputAudioTokens ?? 0, output_audio_tokens: e.outputAudioTokens ?? 0,
      audio_seconds: e.audioSeconds ?? 0,
    });
  },
};
