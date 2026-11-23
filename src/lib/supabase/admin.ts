import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "./env";

/**
 * Server-only client with the secret key: bypasses RLS. Use it only for
 * trusted writes (session results, skill map, vocabulary, usage) after
 * checking the signed-in user owns the data.
 */
export function createAdminClient() {
  const env = getSupabaseEnv();
  const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!env || !secret) throw new Error("SUPABASE_SECRET_KEY is not set");
  return createClient(env.url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
}
