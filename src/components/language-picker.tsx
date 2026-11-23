"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

/** Switches the whole interface language. */
export function LanguagePicker({ label }: { label: string }) {
  const t = useTranslations("common.languageNames");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  return (
    <fieldset aria-busy={pending}>
      <legend className="mb-2 text-sm font-medium text-muted">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {routing.locales.map((l) => {
          const selected = l === locale;
          return (
            <button
              key={l}
              type="button"
              lang={l}
              aria-pressed={selected}
              onClick={() => startTransition(() => router.replace(pathname, { locale: l }))}
              className={`min-h-tap rounded-full border px-4 text-sm font-semibold transition-colors ${
                selected
                  ? "border-accent bg-accent text-on-accent"
                  : "border-line bg-transparent text-fg hover:border-link"
              }`}
            >
              {t(l)}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
