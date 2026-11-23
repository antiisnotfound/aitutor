import { getSupabaseEnv } from "@/lib/supabase/env";

/** Cookie holding the whole demo "account" (dev without Supabase only). */
export const DEMO_COOKIE = "demo-session";

export function isDemoMode() {
  return process.env.NODE_ENV !== "production" && getSupabaseEnv() === null;
}
