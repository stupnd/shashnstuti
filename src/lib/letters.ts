import { createClient } from "@/lib/supabase/server";
import type { Letter, LockedLetter } from "@/lib/database.types";

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
