import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { getSupabaseEnv } from "./env";

/**
 * Refreshes the Supabase session cookie on `response` and returns whether
 * a signed-in user is present. Optimistic check only: pages re-verify.
 */
export async function refreshSession(request: NextRequest, response: NextResponse) {
  const env = getSupabaseEnv();
  if (!env) return { signedIn: false, configured: false };

  const supabase = createServerClient(env.url, env.key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  return { signedIn: Boolean(data?.claims?.sub), configured: true };
}
