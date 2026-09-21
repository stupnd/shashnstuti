import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Settings } from "@/lib/database.types";

/**
 * Per-request cached loaders for things nearly every page needs.
 * `cache()` dedupes calls within one server render.
 */

export const getCurrentProfile = cache(async (): Promise<Profile> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // No profile means the allowlist trigger didn't run for this user — the
  // safest thing is to sign them out.
  if (!profile) {
    await supabase.auth.signOut();
    redirect("/login");
  }
  return profile;
});

export const getProfiles = cache(async (): Promise<Profile[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").order("created_at");
  return data ?? [];
});

/** The other person, if they've signed in at least once. */
export async function getPartner(): Promise<Profile | null> {
  const [me, all] = await Promise.all([getCurrentProfile(), getProfiles()]);
  return all.find((p) => p.id !== me.id) ?? null;
}

export const getSettings = cache(async (): Promise<Settings> => {
  const supabase = await createClient();
  const { data } = await supabase.from("settings").select("*").eq("id", 1).single();
  if (!data) {
    throw new Error(
      "settings row missing — did you run supabase/migrations/20260920000003_seed.sql?",
    );
  }
  return data;
});
