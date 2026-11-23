import "server-only";
import type { LearnerProfile } from "@/lib/types";
import { isDemoMode } from "@/lib/demo-config";
import { getStore } from "@/lib/data/store";
import { levelProgress } from "@/lib/learning/progress";
import { checkinStatus, levelUpStatus } from "./availability";

/** Check-in and level-up availability for a learner (Practice hub, Home, API). */
export async function assessmentStatus(learner: LearnerProfile) {
  const store = await getStore();
  const [lastCheckin, lastLevelUp, skillMap] = await Promise.all([
    store.lastAttempt(learner.id, "checkin", "graded"),
    store.lastAttempt(learner.id, "levelup", "graded"),
    store.getSkillMap(learner.id),
  ]);
  const progress = levelProgress(learner.level, skillMap).progress;
  return {
    checkin: checkinStatus(lastCheckin),
    lastCheckin,
    // MVP has exam content for A1 only (learners at A0 working towards A1).
    levelUp:
      learner.level === "A0"
        ? levelUpStatus({ last: lastLevelUp, progress, bypassGate: isDemoMode() })
        : ({ state: "passed", lastId: lastLevelUp?.id ?? "" } as const),
  };
}
