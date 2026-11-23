import { initLocale } from "@/i18n/locale";
import { getTranslations } from "next-intl/server";

export default async function Page({ params }: PageProps<"/[locale]/progress">) {
  await initLocale(params);
  const t = await getTranslations("progress");
  const tc = await getTranslations("common");
  return (
    <>
      <h1 className="font-display text-3xl">{t("title")}</h1>
      <p className="mt-4 text-muted">{t("body")}</p>
      <span className="mt-4 inline-block rounded-full bg-surface-2 px-3 py-1 text-sm font-semibold">{tc("comingSoon")}</span>
    </>
  );
}
