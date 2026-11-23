import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { refreshSession } from "@/lib/supabase/proxy";
import { DEMO_COOKIE, isDemoMode } from "@/lib/demo-config";

const handleI18n = createIntlMiddleware(routing);

/** Paths (without locale prefix) that need a signed-in user. */
const PROTECTED = ["/home", "/practice", "/progress", "/profile", "/onboarding", "/session"];
/** Paths a signed-in user should skip. */
const AUTH_PAGES = ["/login"];

const matches = (path: string, list: string[]) =>
  list.some((p) => path === p || path.startsWith(`${p}/`));

export async function proxy(request: NextRequest) {
  const response = handleI18n(request);

  // next-intl is redirecting (e.g. "/" → "/sq"): let it.
  if (response.headers.has("location")) return response;

  const signedIn = isDemoMode()
    ? request.cookies.has(DEMO_COOKIE)
    : (await refreshSession(request, response)).signedIn;

  const [, locale, ...rest] = request.nextUrl.pathname.split("/");
  const path = `/${rest.join("/")}`;

  let target: string | null = null;
  if (!signedIn && matches(path, PROTECTED)) target = `/${locale}/login`;
  else if (signedIn && (matches(path, AUTH_PAGES) || path === "/")) target = `/${locale}/home`;
  else if (!signedIn && path === "/") target = `/${locale}/login`;

  if (!target) return response;

  const redirect = NextResponse.redirect(new URL(target, request.url));
  response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
  return redirect;
}

export const config = {
  // Everything except API/auth routes, Next internals and static files.
  matcher: "/((?!api|auth|_next|_vercel|.*\\..*).*)",
};
