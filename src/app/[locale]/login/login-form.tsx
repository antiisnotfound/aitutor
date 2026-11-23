"use client";

import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { AGE_GROUPS, type AgeGroup } from "@/config/app";
import { Link } from "@/i18n/navigation";
import { emailAuth, signInWithGoogle, type AuthState } from "./actions";

type ErrorKey = "generic" | "invalid" | "weakPassword" | "missingFields" | "notConfigured" | "callback";

const AGE_LABEL = { kid: "ageKid", teen: "ageTeen", adult: "ageAdult" } as const;

const inputClass =
  "min-h-tap w-full rounded-xl border border-line bg-surface px-4 text-fg placeholder:text-muted focus:border-link focus:outline-none";

export function LoginForm({ locale, initialError }: { locale: string; initialError?: ErrorKey }) {
  const t = useTranslations("login");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [ageGroup, setAgeGroup] = useState<AgeGroup | null>(null);
  const [state, formAction, pending] = useActionState<AuthState, FormData>(emailAuth, undefined);

  const errorKey = (state?.error ?? initialError) as ErrorKey | undefined;
  const isKid = mode === "signup" && ageGroup === "kid";

  return (
    <div className="flex flex-col gap-5">
      <form action={signInWithGoogle}>
        <input type="hidden" name="locale" value={locale} />
        <button
          type="submit"
          className="flex min-h-tap w-full items-center justify-center gap-3 rounded-xl bg-white px-4 font-semibold text-navy hover:bg-lime-pale"
        >
          <GoogleIcon />
          {t("continueGoogle")}
        </button>
      </form>

      <div className="flex items-center gap-3 text-sm text-muted" aria-hidden="true">
        <span className="h-px flex-1 bg-line" />
        {t("or")}
        <span className="h-px flex-1 bg-line" />
      </div>

      <form action={formAction} className="flex flex-col gap-4" noValidate>
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="mode" value={mode} />

        <label className="flex flex-col gap-1.5 text-sm font-medium">
          {t("email")}
          <input name="email" type="email" autoComplete="email" required className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          {t("password")}
          <input
            name="password"
            type="password"
            required
            minLength={mode === "signup" ? 8 : undefined}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            className={inputClass}
          />
        </label>

        {mode === "signup" && (
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">{t("ageGroup")}</legend>
            <div className="grid gap-2">
              {AGE_GROUPS.map((g) => (
                <label
                  key={g}
                  className={`flex min-h-tap cursor-pointer items-center gap-3 rounded-xl border px-4 ${
                    ageGroup === g ? "border-accent bg-surface" : "border-line"
                  }`}
                >
                  <input
                    type="radio"
                    name="ageGroup"
                    value={g}
                    checked={ageGroup === g}
                    onChange={() => setAgeGroup(g)}
                    className="size-4 accent-lime"
                  />
                  {t(AGE_LABEL[g])}
                </label>
              ))}
            </div>
            {isKid && (
              <p className="mt-3 rounded-xl bg-surface-2 p-3 text-sm">
                {t("kidNotice")}{" "}
                <Link href="/parent-signup" className="font-semibold text-link underline underline-offset-4">
                  {t("parentLink")}
                </Link>
              </p>
            )}
          </fieldset>
        )}

        <div aria-live="polite" className="min-h-0">
          {errorKey && <p className="rounded-xl bg-red-950/60 p-3 text-sm text-red-100">{t(`errors.${errorKey}`)}</p>}
          {state?.notice && <p className="rounded-xl bg-surface-2 p-3 text-sm">{t("checkEmail")}</p>}
        </div>

        <button
          type="submit"
          disabled={pending || isKid || (mode === "signup" && !ageGroup)}
          className="min-h-tap rounded-xl bg-accent px-4 font-bold text-on-accent disabled:opacity-50"
        >
          {mode === "signin" ? t("signIn") : t("createAccount")}
        </button>
      </form>

      <button
        type="button"
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        className="min-h-tap text-sm font-semibold text-link underline underline-offset-4"
      >
        {mode === "signin" ? t("switchToSignUp") : t("switchToSignIn")}
      </button>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
