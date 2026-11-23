import "server-only";
import { TUTORS } from "@/config/learning";
import type { TutorContext } from "@/lib/ai/prompts";
import type { StoredSession } from "@/lib/data/store";
import type { CurrentUser, LearnerProfile } from "@/lib/types";

/** Everything the AI needs to know about this learner and session. */
export function tutorContext(
  user: CurrentUser,
  learner: LearnerProfile,
  session: Pick<StoredSession, "mode" | "hiddenGoal" | "plannedMinutes">,
): TutorContext {
  return {
    tutorName: TUTORS[learner.targetLanguage][learner.tutorGender],
    tutorGender: learner.tutorGender,
    learnerName: user.demo ? null : (user.displayName?.split(" ")[0] ?? null),
    target: learner.targetLanguage,
    native: user.nativeLanguage,
    level: learner.level,
    ageGroup: user.ageGroup,
    goal: learner.goal,
    mode: session.mode,
    hiddenGoal: session.hiddenGoal,
    plannedMinutes: session.plannedMinutes,
  };
}
