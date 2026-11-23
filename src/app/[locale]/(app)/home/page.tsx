import { initLocale } from "@/i18n/locale";
import { getTranslations } from "next-intl/server";
import { getCurrentProfile } from "@/lib/profile";

export default async function HomePage({ params }: PageProps<"/[locale]/home">) {
  await initLocale(params);
  const t = await getTranslations("home");
  const tc = await getTranslations("common");
  const profile = await getCurrentProfile();
  const name = profile?.displayName?.split(" ")[0];

  return (
    <>
      <h1 className="font-display text-3xl">{name ? t("greeting", { name }) : t("greetingNoName")}</h1>
      <section className="mt-6 rounded-card border border-line bg-surface p-5">
        <h2 className="text-lg font-bold">{t("nextUp")}</h2>
        <p className="mt-2 text-muted">{t("nextUpBody")}</p>
        <span className="mt-4 inline-block rounded-full bg-accent px-3 py-1 text-sm font-bold text-on-accent">
          {tc("comingSoon")}
        </span>
      </section>
    </>
  );
}
