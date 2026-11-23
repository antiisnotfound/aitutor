import { initLocale } from "@/i18n/locale";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { LanguagePicker } from "@/components/language-picker";
import { Link } from "@/i18n/navigation";
import { THEME_COOKIE, themeFor } from "@/lib/theme";
import { getCurrentUser } from "@/lib/user";
import { signOut } from "../../login/actions";
import { KidsPreviewToggle } from "./kids-preview-toggle";

export default async function ProfilePage({ params }: PageProps<"/[locale]/profile">) {
  const locale = await initLocale(params);
  const t = await getTranslations("profile");
  const user = await getCurrentUser();
  const tc = await getTranslations("common");
  const to = await getTranslations("onboarding");
  const override = (await cookies()).get(THEME_COOKIE)?.value;
  const kids = themeFor(user?.ageGroup ?? null, override) === "kids";
  const learner = user?.learner;

  return (
    <>
      <h1 className="font-display text-3xl">{t("title")}</h1>

      <section className="mt-6 rounded-card border border-line bg-surface p-5">
        <p className="text-sm text-muted">{t("signedInAs")}</p>
        <p className="mt-1 font-semibold break-all">{user?.email}</p>
      </section>

      {learner && (
        <section className="mt-4 rounded-card border border-line bg-surface p-5">
          <h2 className="font-bold">{t("plan")}</h2>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted">{to("plan.target")}</dt>
            <dd>{tc(`languages.${learner.targetLanguage}`)}</dd>
            <dt className="text-muted">{to("plan.goal")}</dt>
            <dd>{to(`goals.${learner.goal}`)}</dd>
            <dt className="text-muted">{to("plan.daily")}</dt>
            <dd>{to("plan.minutes", { n: learner.dailyMinutes })}</dd>
          </dl>
          <Link
            href="/onboarding"
            className="mt-4 flex min-h-tap items-center justify-center rounded-xl border border-line font-semibold hover:border-link"
          >
            {t("editPlan")}
          </Link>
        </section>
      )}

      <section className="mt-4 rounded-card border border-line bg-surface p-5">
        <LanguagePicker label={t("interfaceLanguage")} />
      </section>

      <section className="mt-4 rounded-card border border-line bg-surface p-5">
        <KidsPreviewToggle label={t("kidsPreview")} initial={kids} />
      </section>

      <form action={signOut} className="mt-8">
        <input type="hidden" name="locale" value={locale} />
        <button
          type="submit"
          className="min-h-tap w-full rounded-xl border border-line font-semibold hover:border-link"
        >
          {t("signOut")}
        </button>
      </form>
    </>
  );
}
