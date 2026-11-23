import { getSupabaseEnv } from "@/lib/supabase/env";

/** Cookie holding the whole demo "account" (dev without Supabase only). */
export const DEMO_COOKIE = "demo-session";

/**
 * Demo mode: no Supabase configured, and either local development or a
 * deployment that opts in with DEMO_MODE=1 (e.g. a preview for showing the app).
 */
export function isDemoMode() {
  const allowed = process.env.NODE_ENV !== "production" || process.env.DEMO_MODE === "1";
  return allowed && getSupabaseEnv() === null;
}
