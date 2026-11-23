import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AssessmentRunner } from "@/components/assessment/assessment-runner";
import { initLocale } from "@/i18n/locale";
import { redirect } from "@/i18n/navigation";
import { assessmentStatus } from "@/lib/assessment/status";
import { getCurrentUser } from "@/lib/user";

export async function generateMetadata({ params }: PageProps<"/[locale]/practice/exam">): Promise<Metadata> {
  const locale = await initLocale(params);
  const t = await getTranslations({ locale, namespace: "assessment" });
  return { title: t("levelup.title") };
}

export default async function ExamPage({ params }: PageProps<"/[locale]/practice/exam">) {
  const locale = await initLocale(params);
  const learner = (await getCurrentUser())?.learner;
  if (!learner) return null;
  const { levelUp } = await assessmentStatus(learner);
  if (levelUp.state !== "available") return redirect({ href: "/practice", locale });
  return <AssessmentRunner kind="levelup" target={learner.targetLanguage} />;
}
