import { initLocale } from "@/i18n/locale";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { BrandMark } from "@/components/brand-mark";
import { LanguagePicker } from "@/components/language-picker";
import { Link } from "@/i18n/navigation";
import { isDemoMode } from "@/lib/demo-config";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { startDemo } from "./actions";
import { LoginForm } from "./login-form";

export async function generateMetadata({ params }: PageProps<"/[locale]/login">): Promise<Metadata> {
  const locale = await initLocale(params);
  const t = await getTranslations({ locale, namespace: "login" });
  return { title: t("metaTitle") };
}

const KNOWN_ERRORS = ["generic", "callback", "notConfigured"] as const;

export default async function LoginPage({ params, searchParams }: PageProps<"/[locale]/login">) {
  const locale = await initLocale(params);
  const t = await getTranslations("login");
  const tc = await getTranslations("common");

  const { error } = await searchParams;
  const urlError = KNOWN_ERRORS.find((e) => e === error);
  const configured = getSupabaseEnv() !== null;

  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 py-10">
      <header className="mb-8 text-center">
        <BrandMark />
        <p className="mt-3 text-lg text-muted">{t("tagline")}</p>
      </header>

      <div className="mb-8">
        <LanguagePicker label={t("nativeLanguage")} />
      </div>

      {isDemoMode() && (
        <form action={startDemo} className="mb-6 rounded-card border border-dashed border-link p-4">
          <input type="hidden" name="locale" value={locale} />
          <p className="text-sm text-muted">{t("demoHint")}</p>
          <button type="submit" className="mt-3 min-h-tap w-full rounded-xl border border-link font-semibold text-link">
            {t("demoButton")}
          </button>
        </form>
      )}

      <LoginForm
        locale={locale}
        initialError={urlError ?? (configured ? undefined : "notConfigured")}
      />

      <p className="mt-6 text-center">
        <Link href="/parent-signup" className="font-semibold text-link underline underline-offset-4">
          {t("parentLink")}
        </Link>
      </p>

      <p className="mt-6 text-center text-xs text-muted">{t("terms")}</p>
      <p className="mt-auto pt-10 text-center text-xs text-muted">{tc("partner")}</p>
    </main>
  );
}
