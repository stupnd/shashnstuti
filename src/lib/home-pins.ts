import { createClient } from "@/lib/supabase/server";
import { signPhotoUrls } from "@/lib/entries";

export const MAX_HOME_PINS = 24;

export type HomePinCard = {
  photoId: string;
  entryId: string;
  url: string;
  caption: string | null;
  title: string | null;
  date: string;
  width: number;
  height: number;
  pinnedAt: string;
  sortOrder: number;
};

export type PinBrowsePhoto = {
  photoId: string;
  entryId: string;
  url: string;
  caption: string | null;
  title: string | null;
  date: string;
  width: number;
  height: number;
  pinned: boolean;
};

type EntryCursor = { date: string; created_at: string };

/** Photos currently pinned to home. */
export async function fetchHomePins(): Promise<HomePinCard[]> {
  const supabase = await createClient();
  const { data: pins, error } = await supabase
    .from("home_pins")
    .select("photo_id, pinned_at, sort_order")
    .order("sort_order", { ascending: true })
    .order("pinned_at", { ascending: false });
  if (error) throw new Error(error.message);
  if (!pins?.length) return [];

  const ids = pins.map((p) => p.photo_id);
  const { data: photos, error: photoErr } = await supabase
    .from("photos")
    .select("id, entry_id, storage_path, caption, width, height, entries!inner(id, date, title)")
    .in("id", ids);
  if (photoErr) throw new Error(photoErr.message);

  type PhotoRow = {
    id: string;
    entry_id: string;
    storage_path: string;
    caption: string | null;
    width: number;
    height: number;
    entries: { id: string; date: string; title: string | null };
  };

  const byId = new Map(((photos ?? []) as unknown as PhotoRow[]).map((p) => [p.id, p]));
  const urls = await signPhotoUrls(
    supabase,
    [...byId.values()].map((p) => p.storage_path),
  );

  return pins
    .map((pin) => {
      const p = byId.get(pin.photo_id);
      if (!p) return null;
      const url = urls.get(p.storage_path) ?? "";
      if (!url) return null;
      return {
        photoId: pin.photo_id,
        entryId: p.entries.id,
        url,
        caption: p.caption,
        title: p.entries.title,
        date: p.entries.date,
        width: p.width,
        height: p.height,
        pinnedAt: pin.pinned_at,
        sortOrder: pin.sort_order,
      };
    })
    .filter((p): p is HomePinCard => p !== null)
    .slice(0, MAX_HOME_PINS);
}

export async function fetchPinnedPhotoIds(): Promise<Set<string>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("home_pins").select("photo_id");
  if (error) throw new Error(error.message);
  return new Set((data ?? []).map((r) => r.photo_id));
}

/** Flat photo feed for the pin picker — newest entry dates first. */
export async function fetchPhotosForPinning(opts: {
  before?: EntryCursor | null;
  limit?: number;
}): Promise<{ photos: PinBrowsePhoto[]; next: EntryCursor | null }> {
  const supabase = await createClient();
  const limit = opts.limit ?? 36;
  const pinned = await fetchPinnedPhotoIds();

  let q = supabase
    .from("entries")
    .select("id, date, title, created_at, photos(id, storage_path, caption, width, height, sort_order)")
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

  type EntryRow = {
    id: string;
    date: string;
    title: string | null;
    created_at: string;
    photos: {
      id: string;
      storage_path: string;
      caption: string | null;
      width: number;
      height: number;
      sort_order: number;
    }[];
  };

  const rows = (data ?? []) as unknown as EntryRow[];
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  const flat = page.flatMap((e) =>
    [...(e.photos ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((p) => ({ entry: e, photo: p })),
  );

  const urls = await signPhotoUrls(
    supabase,
    flat.map((f) => f.photo.storage_path),
  );

  const photos: PinBrowsePhoto[] = flat
    .map(({ entry, photo }) => ({
      photoId: photo.id,
      entryId: entry.id,
      url: urls.get(photo.storage_path) ?? "",
      caption: photo.caption,
      title: entry.title,
      date: entry.date,
      width: photo.width,
      height: photo.height,
      pinned: pinned.has(photo.id),
    }))
    .filter((p) => p.url);

  const last = page[page.length - 1];
  return {
    photos,
    next: hasMore && last ? { date: last.date, created_at: last.created_at } : null,
  };
}
