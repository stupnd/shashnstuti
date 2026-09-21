"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";

export async function addReaction(entryId: string, emoji: string, reply: string): Promise<void> {
  const me = await getCurrentProfile();
  const supabase = await createClient();
  const e = emoji.trim();
  if (!e) throw new Error("Pick an emoji");
  const { error } = await supabase
    .from("reactions")
    .insert({ entry_id: entryId, author: me.id, emoji: e, reply: reply.trim() || null });
  if (error) throw new Error(error.message);
  revalidatePath(`/entry/${entryId}`);
}

export async function deleteReaction(id: string, entryId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("reactions").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/entry/${entryId}`);
}
