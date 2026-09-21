import { createClient } from "@/lib/supabase/server";
import type { Letter, LockedLetter } from "@/lib/database.types";
import { getCurrentProfile } from "@/lib/data";

export async function fetchLetters(): Promise<{ letters: Letter[]; locked: LockedLetter[] }> {
  const supabase = await createClient();
  const [{ data: letters }, { data: locked }] = await Promise.all([
    supabase.from("letters").select("*").order("created_at", { ascending: false }),
    supabase.rpc("my_locked_letters"),
  ]);
  return { letters: letters ?? [], locked: (locked ?? []) as LockedLetter[] };
}

export async function fetchLetter(id: string): Promise<Letter | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("letters").select("*").eq("id", id).maybeSingle();
  return data;
}

/** Sealed letters addressed to me that are unlocked and still unread. */
export async function fetchUnopenedLetters(): Promise<Pick<Letter, "id" | "title" | "author" | "created_at">[]> {
  const [me, supabase] = await Promise.all([getCurrentProfile(), createClient()]);
  const { data } = await supabase
    .from("letters")
    .select("id, title, author, created_at")
    .eq("recipient", me.id)
    .is("opened_at", null)
    .order("created_at", { ascending: false });
  return data ?? [];
}
