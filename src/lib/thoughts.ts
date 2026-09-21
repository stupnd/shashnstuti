import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";

export const THOUGHTS_SESSION_ID = "thoughts";
export const MAX_THOUGHTS = 40;
export const MAX_THOUGHT_LEN = 160;

export type Thought = {
  id: string;
  author: string;
  body: string;
  created_at: string;
};

export type ThoughtsState = { items: Thought[] };

export function emptyThoughts(): ThoughtsState {
  return { items: [] };
}

export function parseThoughts(raw: unknown): ThoughtsState {
  if (!raw || typeof raw !== "object") return emptyThoughts();
  const items = (raw as { items?: unknown }).items;
  if (!Array.isArray(items)) return emptyThoughts();
  const cleaned: Thought[] = [];
  for (const row of items) {
    if (!row || typeof row !== "object") continue;
    const t = row as Partial<Thought>;
    if (typeof t.id !== "string" || typeof t.author !== "string" || typeof t.body !== "string" || typeof t.created_at !== "string") continue;
    const body = t.body.trim();
    if (!body) continue;
    cleaned.push({ id: t.id, author: t.author, body: body.slice(0, MAX_THOUGHT_LEN), created_at: t.created_at });
  }
  return { items: cleaned.slice(0, MAX_THOUGHTS) };
}

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
