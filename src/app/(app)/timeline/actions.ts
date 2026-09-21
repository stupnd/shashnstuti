"use server";

import { fetchEntriesPage, type Cursor } from "@/lib/entries";

export async function loadMoreEntries(cursor: Cursor) {
  return fetchEntriesPage({ before: cursor });
}
