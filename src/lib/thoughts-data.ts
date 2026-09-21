import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import {
  emptyThoughts,
  parseThoughts,
  THOUGHTS_SESSION_ID,
  type ThoughtsState,
} from "@/lib/thoughts";

/** Prefetched for the home page (server). */
export async function fetchThoughts(): Promise<ThoughtsState> {
  const supabase = await createClient();
  const { data } = await supabase.from("game_sessions").select("state").eq("id", THOUGHTS_SESSION_ID).maybeSingle();
  if (!data) return emptyThoughts();
  return parseThoughts(data.state);
}

export async function ensureThoughtsRow(): Promise<void> {
  const me = await getCurrentProfile();
  const supabase = await createClient();
  await supabase.from("game_sessions").upsert(
    { id: THOUGHTS_SESSION_ID, state: emptyThoughts(), updated_by: me.id },
    { onConflict: "id", ignoreDuplicates: true },
  );
}
