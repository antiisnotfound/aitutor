import { getTranslations } from "next-intl/server";
import { TUTORS } from "@/config/learning";
import { initLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/user";

/** Placeholder until the live voice session lands in Phase 3. */
export default async function SessionPage({ params }: PageProps<"/[locale]/session">) {
  await initLocale(params);
  const [t, tc, user] = await Promise.all([getTranslations("session"), getTranslations("common"), getCurrentUser()]);
  const learner = user?.learner;
  const name = learner ? TUTORS[learner.targetLanguage][learner.tutorGender] : "";

  return (
    <>
      <h1 className="font-display text-3xl">{t("title", { name })}</h1>
      <p className="mt-4 text-muted">{t("body")}</p>
      <span className="mt-4 inline-block rounded-full bg-surface-2 px-3 py-1 text-sm font-semibold">{tc("comingSoon")}</span>
      <Link href="/home" className="mt-8 flex min-h-tap items-center justify-center rounded-xl border border-line font-semibold hover:border-link">
        {t("back")}
      </Link>
    </>
  );
}
