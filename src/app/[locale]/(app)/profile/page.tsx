import { initLocale } from "@/i18n/locale";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { LanguagePicker } from "@/components/language-picker";
import { getCurrentProfile } from "@/lib/profile";
import { THEME_COOKIE } from "@/lib/theme";
import { signOut } from "../../login/actions";
import { KidsPreviewToggle } from "./kids-preview-toggle";

export default async function ProfilePage({ params }: PageProps<"/[locale]/profile">) {
  const locale = await initLocale(params);
  const t = await getTranslations("profile");
  const profile = await getCurrentProfile();
  const override = (await cookies()).get(THEME_COOKIE)?.value;
  const kids = override ? override === "kids" : profile?.ageGroup === "kid";

  return (
    <>
      <h1 className="font-display text-3xl">{t("title")}</h1>

      <section className="mt-6 rounded-card border border-line bg-surface p-5">
        <p className="text-sm text-muted">{t("signedInAs")}</p>
        <p className="mt-1 font-semibold break-all">{profile?.email}</p>
      </section>

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
