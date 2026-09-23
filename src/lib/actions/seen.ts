"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";

export type Section = "messages" | "book";

/** Clear a nav badge — called when you actually open the section. */
export async function markSeen(section: Section): Promise<void> {
  const me = await getCurrentProfile();
  const now = new Date().toISOString();
  // Spelled out rather than a computed key so the update stays typed.
  const patch = section === "messages" ? { seen_messages_at: now } : { seen_book_at: now };

  const supabase = await createClient();
  await supabase.from("profiles").update(patch).eq("id", me.id);
  revalidatePath("/", "layout");
}
