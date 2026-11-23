import type { AgeGroup, TargetLanguage, UiLocale } from "@/config/app";
import type { CefrLevel, DailyMinutes, Goal, Skill, TutorGender } from "@/config/learning";

export type LearnerProfile = {
  id: string;
  targetLanguage: TargetLanguage;
  level: CefrLevel;
  goal: Goal;
  focusSkills: Skill[];
  dailyMinutes: DailyMinutes;
  tutorGender: TutorGender;
  placementDone: boolean;
};

export type CurrentUser = {
  id: string;
  email: string | null;
  displayName: string | null;
  ageGroup: AgeGroup | null;
  nativeLanguage: UiLocale;
  /** The learner profile for the language currently being studied. */
  learner: LearnerProfile | null;
  demo: boolean;
};

export type SkillStatus = "not_seen" | "practising" | "mastered";

export type DemoState = Omit<CurrentUser, "demo">;
