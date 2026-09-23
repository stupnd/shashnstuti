import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Person, Settings } from "@/lib/database.types";

/** Matches the photo TTL: long enough that the image optimizer can cache it. */
export const AVATAR_URL_TTL = 60 * 60 * 24;

/**
 * Per-request cached loaders for things nearly every page needs.
 * `cache()` dedupes calls within one server render.
 */

export const getCurrentProfile = cache(async (): Promise<Person> => {
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
  // Reuse the request-cached list so the avatar is signed once, not per call.
  const all = await getProfiles();
  return all.find((p) => p.id === profile.id) ?? { ...profile, avatar_url: null };
});

/**
 * Both profiles, with any avatar photo signed. There are only ever two rows,
 * so this is a single extra storage call per request — and it's cached, so
 * every Avatar on the page shares it.
 */
export const getProfiles = cache(async (): Promise<Person[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").order("created_at");
  const rows = data ?? [];

  const paths = rows.map((r) => r.avatar_path).filter((p): p is string => Boolean(p));
  const urls = new Map<string, string>();
  if (paths.length) {
    const { data: signed } = await supabase.storage
      .from("avatars")
      .createSignedUrls(paths, AVATAR_URL_TTL);
    for (const item of signed ?? []) {
      if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl);
    }
  }

  return rows.map((r) => ({ ...r, avatar_url: r.avatar_path ? urls.get(r.avatar_path) ?? null : null }));
});

/** The other person, if they've signed in at least once. */
export async function getPartner(): Promise<Person | null> {
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
