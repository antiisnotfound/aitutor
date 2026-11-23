import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";

/**
 * Lands here after Google OAuth (`?code=`) or an email confirmation link
 * (`?code=` or `?token_hash=&type=`). Exchanges it for a session cookie.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const localeParam = searchParams.get("locale");
  const locale = routing.locales.find((l) => l === localeParam) ?? routing.defaultLocale;

  const supabase = await createClient();
  let ok = false;
  if (supabase) {
    const code = searchParams.get("code");
    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type") as EmailOtpType | null;
    if (code) ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
    else if (tokenHash && type) ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  }

  const target = ok ? `/${locale}/home` : `/${locale}/login?error=callback`;
  return NextResponse.redirect(new URL(target, origin));
}
