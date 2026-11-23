import "server-only";
import { cache } from "react";
import type { AgeGroup } from "@/config/app";
import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  email: string | null;
  displayName: string | null;
  ageGroup: AgeGroup | null;
};

/** Current user + profile, deduplicated per request. Null when signed out. */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("display_name, age_group")
    .eq("id", auth.user.id)
    .maybeSingle();

  const meta = auth.user.user_metadata ?? {};
  return {
    id: auth.user.id,
    email: auth.user.email ?? null,
    displayName: data?.display_name ?? meta.full_name ?? meta.name ?? null,
    ageGroup: data?.age_group ?? meta.age_group ?? null,
  };
});
