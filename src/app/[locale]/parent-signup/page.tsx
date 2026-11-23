import { initLocale } from "@/i18n/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BrandMark } from "@/components/brand-mark";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({ params }: PageProps<"/[locale]/parent-signup">): Promise<Metadata> {
  const locale = await initLocale(params);
  const t = await getTranslations({ locale, namespace: "parent" });
  return { title: t("metaTitle") };
}

/** Placeholder: the real parent/guardian consent flow ships in Phase 6. */
export default async function ParentSignupPage({ params }: PageProps<"/[locale]/parent-signup">) {
  await initLocale(params);
  const t = await getTranslations("parent");
  const tc = await getTranslations("common");

  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 py-10">
      <BrandMark size="sm" />
      <h1 className="mt-10 font-display text-3xl">{t("title")}</h1>
      <p className="mt-4 text-muted">{t("body")}</p>
      <span className="mt-6 w-fit rounded-full bg-surface-2 px-3 py-1 text-sm font-semibold">{tc("comingSoon")}</span>
      <Link
        href="/login"
        className="mt-10 flex min-h-tap items-center justify-center rounded-xl border border-line font-semibold hover:border-link"
      >
        {t("back")}
      </Link>
    </main>
  );
}
