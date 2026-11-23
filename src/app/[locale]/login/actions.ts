"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AGE_GROUPS, type AgeGroup } from "@/config/app";
import { routing } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; notice?: string } | undefined;

async function siteOrigin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const h = await headers();
  return h.get("origin") ?? `https://${h.get("host")}`;
}

function cleanLocale(value: FormDataEntryValue | null) {
  return routing.locales.find((l) => l === value) ?? routing.defaultLocale;
}

export async function signInWithGoogle(formData: FormData) {
  const locale = cleanLocale(formData.get("locale"));
  const supabase = await createClient();
  if (!supabase) redirect(`/${locale}/login?error=notConfigured`);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await siteOrigin()}/auth/callback?locale=${locale}` },
  });
  if (error || !data.url) redirect(`/${locale}/login?error=generic`);
  redirect(data.url);
}

export async function emailAuth(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const locale = cleanLocale(formData.get("locale"));
  const mode = formData.get("mode") === "signup" ? "signup" : "signin";
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const ageGroup = formData.get("ageGroup") as AgeGroup | null;

  if (!email || !password) return { error: "missingFields" };

  const supabase = await createClient();
  if (!supabase) return { error: "notConfigured" };

  if (mode === "signin") {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.code === "invalid_credentials" ? "invalid" : "generic" };
    redirect(`/${locale}/home`);
  }

  // Sign-up. Children go through the parent flow instead.
  if (!ageGroup || !AGE_GROUPS.includes(ageGroup) || ageGroup === "kid") return { error: "missingFields" };
  if (password.length < 8) return { error: "weakPassword" };

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { age_group: ageGroup, native_language: locale },
      emailRedirectTo: `${await siteOrigin()}/auth/callback?locale=${locale}`,
    },
  });
  if (error) return { error: error.code === "weak_password" ? "weakPassword" : "generic" };

  // Email confirmation on → no session yet.
  if (!data.session) return { notice: "checkEmail" };
  redirect(`/${locale}/home`);
}

export async function signOut(formData: FormData) {
  const locale = cleanLocale(formData.get("locale"));
  const supabase = await createClient();
  await supabase?.auth.signOut();
  redirect(`/${locale}/login`);
}
