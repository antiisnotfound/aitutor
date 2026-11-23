import { getSupabaseEnv } from "@/lib/supabase/env";

/** Cookie holding the whole demo "account" (dev without Supabase only). */
export const DEMO_COOKIE = "demo-session";

/**
 * Demo mode: no Supabase configured, and either local development or a
 * deployment that opts in with DEMO_MODE=1 (e.g. a preview for showing the app).
 */
export function isDemoMode() {
  const allowed = process.env.NODE_ENV !== "production" || demoFlag();
  return allowed && getSupabaseEnv() === null;
}

/** DEMO_MODE=1 / true / yes (tolerates quotes and spaces pasted into a dashboard). */
export function demoFlag() {
  const v = (process.env.DEMO_MODE ?? "").trim().replace(/^["']|["']$/g, "").toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}
