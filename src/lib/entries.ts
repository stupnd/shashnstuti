import { createClient } from "@/lib/supabase/server";
import type { Entry, Photo, Profile, Reaction } from "@/lib/database.types";

export type PhotoWithUrl = Pick<Photo, "id" | "width" | "height" | "sort_order" | "storage_path" | "caption" | "date_source"> & {
  url: string;
};

export type EntryCard = Entry & {
  photos: PhotoWithUrl[];
  author_profile: Pick<Profile, "id" | "display_name" | "avatar_emoji">;
};

export type ReactionWithAuthor = Reaction & {
  author_profile: Pick<Profile, "id" | "display_name" | "avatar_emoji">;
};

export const SIGNED_URL_TTL = 60 * 60; // 1 hour
export const PAGE_SIZE = 24;

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

/** Batch-sign storage paths. Missing/failed paths get an empty string. */
export async function signPhotoUrls(
  supabase: SupabaseServer,
  paths: string[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (paths.length === 0) return out;
  const { data } = await supabase.storage
    .from("photos")
    .createSignedUrls(paths, SIGNED_URL_TTL);
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) out.set(item.path, item.signedUrl);
  }
  return out;
}

const ENTRY_SELECT =
  "*, photos(id, width, height, sort_order, storage_path, caption, date_source), author_profile:profiles!entries_author_fkey(id, display_name, avatar_emoji)";

type RawEntry = Entry & {
  photos: Pick<Photo, "id" | "width" | "height" | "sort_order" | "storage_path" | "caption" | "date_source">[];
  author_profile: Pick<Profile, "id" | "display_name" | "avatar_emoji">;
};

async function hydrate(supabase: SupabaseServer, rows: RawEntry[]): Promise<EntryCard[]> {
  const paths = rows.flatMap((r) => r.photos.map((p) => p.storage_path));
  const urls = await signPhotoUrls(supabase, paths);
  return rows.map((r) => ({
    ...r,
    photos: [...r.photos]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((p) => ({ ...p, url: urls.get(p.storage_path) ?? "" })),
  }));
}

export type Cursor = { date: string; created_at: string };

/** Newest first, keyset-paginated on (date, created_at). */
export async function fetchEntriesPage(opts: {
  before?: Cursor | null;
  limit?: number;
}): Promise<{ entries: EntryCard[]; next: Cursor | null }> {
  const supabase = await createClient();
  const limit = opts.limit ?? PAGE_SIZE;

  let q = supabase
    .from("entries")
    .select(ENTRY_SELECT)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (opts.before) {
    q = q.or(
      `date.lt.${opts.before.date},and(date.eq.${opts.before.date},created_at.lt.${opts.before.created_at})`,
    );
  }

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as RawEntry[];
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const entries = await hydrate(supabase, page);
  const last = page[page.length - 1];
  return {
    entries,
    next: hasMore && last ? { date: last.date, created_at: last.created_at } : null,
  };
}

export async function fetchEntry(id: string): Promise<EntryCard | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("entries").select(ENTRY_SELECT).eq("id", id).maybeSingle();
  if (!data) return null;
  const [entry] = await hydrate(supabase, [data as unknown as RawEntry]);
  return entry;
}

export async function fetchReactions(entryId: string): Promise<ReactionWithAuthor[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reactions")
    .select("*, author_profile:profiles!reactions_author_fkey(id, display_name, avatar_emoji)")
    .eq("entry_id", entryId)
    .order("created_at");
  return (data ?? []) as unknown as ReactionWithAuthor[];
}

/** Entries from this calendar day in earlier years. */
export async function fetchOnThisDay(today: string): Promise<EntryCard[]> {
  const supabase = await createClient();
  const [, mm, dd] = today.split("-");
  const thisYear = Number(today.slice(0, 4));
  const candidates: string[] = [];
  for (let y = thisYear - 1; y >= thisYear - 15; y--) candidates.push(`${y}-${mm}-${dd}`);
  const { data } = await supabase
    .from("entries")
    .select(ENTRY_SELECT)
    .in("date", candidates)
    .order("date", { ascending: false });
  return hydrate(supabase, (data ?? []) as unknown as RawEntry[]);
}

export async function fetchLatest(limit = 4): Promise<EntryCard[]> {
  const { entries } = await fetchEntriesPage({ limit });
  return entries;
}

export async function fetchRandomEntryId(): Promise<string | null> {
  const supabase = await createClient();
  const { count } = await supabase.from("entries").select("id", { count: "exact", head: true });
  if (!count) return null;
  const offset = Math.floor(Math.random() * count);
  const { data } = await supabase
    .from("entries")
    .select("id")
    .order("date")
    .range(offset, offset)
    .maybeSingle();
  return data?.id ?? null;
}

/** Entries that have coordinates, for the map. */
export async function fetchPinnedEntries(): Promise<EntryCard[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("entries")
    .select(ENTRY_SELECT)
    .not("place_lat", "is", null)
    .order("date", { ascending: false });
  return hydrate(supabase, (data ?? []) as unknown as RawEntry[]);
}

export type Slide = {
  photoId: string;
  entryId: string;
  url: string;
  caption: string | null;
  title: string | null;
  note: string;
  place: string | null;
  date: string;
  width: number;
  height: number;
  milestone: boolean;
};

/** Every photo in a date range, oldest first, for Watch mode. */
export async function fetchSlides(from?: string, to?: string): Promise<Slide[]> {
  const supabase = await createClient();
  let q = supabase
    .from("entries")
    .select("id, date, title, note, place, is_milestone, photos(id, storage_path, caption, width, height, sort_order)")
    .order("date")
    .order("created_at");
  if (from) q = q.gte("date", from);
  if (to) q = q.lt("date", to);
  const { data } = await q;
  const rows = data ?? [];
  const paths = rows.flatMap((e) => (e.photos ?? []).map((p) => p.storage_path));
  const urls = await signPhotoUrls(supabase, paths);
  return rows.flatMap((e) =>
    [...(e.photos ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((p) => ({
        photoId: p.id,
        entryId: e.id,
        url: urls.get(p.storage_path) ?? "",
        caption: p.caption,
        title: e.title,
        note: e.note,
        place: e.place,
        date: e.date,
        width: p.width,
        height: p.height,
        milestone: e.is_milestone,
      })),
  ).filter((s) => s.url);
}
