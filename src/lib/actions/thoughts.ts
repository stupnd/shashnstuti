"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getPartner } from "@/lib/data";
import { notifyPartner } from "@/lib/push";
import {
  emptyThoughts,
  MAX_THOUGHT_LEN,
  MAX_THOUGHTS,
  parseThoughts,
  THOUGHTS_SESSION_ID,
  type Thought,
  type ThoughtsState,
} from "@/lib/thoughts";
import { ensureThoughtsRow } from "@/lib/thoughts-data";

async function readState(): Promise<ThoughtsState> {
  await ensureThoughtsRow();
  const supabase = await createClient();
  const { data } = await supabase.from("game_sessions").select("state").eq("id", THOUGHTS_SESSION_ID).maybeSingle();
  return data ? parseThoughts(data.state) : emptyThoughts();
}

async function writeState(state: ThoughtsState): Promise<void> {
  const me = await getCurrentProfile();
  const supabase = await createClient();
  const { error } = await supabase
    .from("game_sessions")
    .upsert({
      id: THOUGHTS_SESSION_ID,
      state,
      updated_at: new Date().toISOString(),
      updated_by: me.id,
    });
  if (error) throw new Error(error.message);
}

export async function sendThought(raw: string): Promise<{ ok: true; thought: Thought } | { error: string }> {
  const body = raw.trim().slice(0, MAX_THOUGHT_LEN);
  if (!body) return { error: "write a little something first" };
  const partner = await getPartner();
  if (!partner) return { error: "waiting for your person to sign in once" };

  const me = await getCurrentProfile();
  const current = await readState();
  const thought: Thought = {
    id: crypto.randomUUID(),
    author: me.id,
    body,
    created_at: new Date().toISOString(),
  };
  const next: ThoughtsState = {
    items: [thought, ...current.items].slice(0, MAX_THOUGHTS),
  };
  await writeState(next);
  await notifyPartner(partner.id, {
    title: me.display_name,
    body: body.length > 80 ? `${body.slice(0, 77)}…` : body,
    url: "/messages",
    tag: "thought",
  });
  revalidatePath("/");
  revalidatePath("/messages");
  return { ok: true, thought };
}

export async function deleteThought(id: string): Promise<{ ok: true } | { error: string }> {
  const me = await getCurrentProfile();
  const current = await readState();
  const target = current.items.find((t) => t.id === id);
  if (!target) return { error: "already gone" };
  if (target.author !== me.id) return { error: "only you can take that one back" };
  await writeState({ items: current.items.filter((t) => t.id !== id) });
  revalidatePath("/");
  return { ok: true };
}
