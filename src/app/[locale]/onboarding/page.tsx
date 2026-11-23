import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { initLocale } from "@/i18n/locale";
import { getCurrentUser } from "@/lib/user";
import { OnboardingWizard } from "./wizard";

export async function generateMetadata({ params }: PageProps<"/[locale]/onboarding">): Promise<Metadata> {
  const locale = await initLocale(params);
  const t = await getTranslations({ locale, namespace: "onboarding" });
  return { title: t("metaTitle") };
}

export default async function OnboardingPage({ params }: PageProps<"/[locale]/onboarding">) {
  const locale = await initLocale(params);
  const user = await getCurrentUser();
  if (!user) return redirect({ href: "/login", locale });

  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 py-6 md:max-w-xl">
      <OnboardingWizard
        locale={locale}
        needsAgeGroup={!user.ageGroup}
        existing={user.learner}
      />
    </main>
  );
}
