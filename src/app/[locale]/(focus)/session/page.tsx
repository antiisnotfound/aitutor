import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { AVATARS } from "@/config/avatars";
import { TUTORS } from "@/config/learning";
import { initLocale } from "@/i18n/locale";
import { THEME_COOKIE, themeFor } from "@/lib/theme";
import { getCurrentUser } from "@/lib/user";
import { LiveSession } from "./live-session";

export async function generateMetadata({ params }: PageProps<"/[locale]/session">): Promise<Metadata> {
  const locale = await initLocale(params);
  const t = await getTranslations({ locale, namespace: "live" });
  return { title: t("metaTitle") };
}

export default async function SessionPage({ params }: PageProps<"/[locale]/session">) {
  await initLocale(params);
  const [user, tc] = await Promise.all([getCurrentUser(), getTranslations("common")]);
  const learner = user?.learner;
  if (!user || !learner) return null; // layout redirects
  const kids = themeFor(user.ageGroup, (await cookies()).get(THEME_COOKIE)?.value) === "kids";

  return (
    <LiveSession
      tutorName={TUTORS[learner.targetLanguage][learner.tutorGender]}
      avatar={AVATARS[learner.targetLanguage][learner.tutorGender]}
      target={learner.targetLanguage}
      level={learner.level === "A0" ? "A1" : learner.level}
      placement={!learner.placementDone}
      nativeName={tc(`languagesInline.${user.nativeLanguage}`)}
      learnerInitial={(user.displayName ?? "?").charAt(0).toUpperCase()}
      kids={kids}
      demo={!process.env.OPENAI_API_KEY}
    />
  );
}
