import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import { fetchThoughts } from "@/lib/thoughts-data";

export type Unread = { messages: number; book: number };

/**
 * What's arrived from the other person since you last opened each section.
 * Only ever counts *their* activity — your own notes and moments shouldn't
 * badge your own nav.
 */
export async function fetchUnread(): Promise<Unread> {
  const me = await getCurrentProfile();

  // A pre-migration profile has no markers; treat that as "nothing new".
  const seenMessages = me.seen_messages_at ? new Date(me.seen_messages_at).getTime() : Date.now();
  const seenBook = me.seen_book_at ?? new Date().toISOString();

  const supabase = await createClient();
  const [thoughts, entries] = await Promise.all([
    fetchThoughts(),
    supabase
      .from("entries")
      .select("id", { count: "exact", head: true })
      .neq("author", me.id)
      .gt("created_at", seenBook),
  ]);

  const messages = thoughts.items.filter(
    (t) => t.author !== me.id && new Date(t.created_at).getTime() > seenMessages,
  ).length;

  return { messages, book: entries.count ?? 0 };
}
