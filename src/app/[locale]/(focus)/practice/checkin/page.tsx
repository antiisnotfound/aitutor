import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AssessmentRunner } from "@/components/assessment/assessment-runner";
import { initLocale } from "@/i18n/locale";
import { getCurrentUser } from "@/lib/user";

export async function generateMetadata({ params }: PageProps<"/[locale]/practice/checkin">): Promise<Metadata> {
  const locale = await initLocale(params);
  const t = await getTranslations({ locale, namespace: "assessment" });
  return { title: t("checkin.title") };
}

export default async function CheckinPage({ params }: PageProps<"/[locale]/practice/checkin">) {
  await initLocale(params);
  const learner = (await getCurrentUser())?.learner;
  if (!learner) return null;
  return <AssessmentRunner kind="checkin" target={learner.targetLanguage} />;
}
