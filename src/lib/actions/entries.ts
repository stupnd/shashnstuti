"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import { geocode } from "@/lib/geocode";
import type { DateSource } from "@/lib/database.types";

export type EntryInput = {
  date: string;
  title: string;
  note: string;
  place: string;
  mood: string;
  tags: string[];
  is_milestone: boolean;
  /** GPS from the photos' EXIF, used when the place has no geocode hit. */
  fallbackLatLng?: { lat: number; lng: number } | null;
};

function clean(input: EntryInput) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new Error("Pick a date.");
  return {
    date: input.date,
    title: input.title.trim() || null,
    note: input.note.trim(),
    place: input.place.trim() || null,
    mood: input.mood.trim() || null,
    tags: Array.from(new Set(input.tags.map((t) => t.trim().toLowerCase()).filter(Boolean))),
    is_milestone: Boolean(input.is_milestone),
  };
}

async function resolveLocation(place: string | null, fallback?: EntryInput["fallbackLatLng"]) {
  if (place) {
    const hit = await geocode(place);
    if (hit) return { place_lat: hit.lat, place_lng: hit.lng };
  }
  if (fallback) return { place_lat: fallback.lat, place_lng: fallback.lng };
  return { place_lat: null, place_lng: null };
}

function revalidateAll() {
  revalidatePath("/", "layout");
}

export async function createEntry(input: EntryInput): Promise<{ id: string }> {
  const me = await getCurrentProfile();
  const supabase = await createClient();
  const fields = clean(input);
  const loc = await resolveLocation(fields.place, input.fallbackLatLng);

  const { data, error } = await supabase
    .from("entries")
    .insert({ ...fields, ...loc, author: me.id })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidateAll();
  return { id: data.id };
}

export async function updateEntry(id: string, input: EntryInput): Promise<void> {
  const supabase = await createClient();
  const fields = clean(input);
  const { data: existing } = await supabase
    .from("entries")
    .select("place, place_lat, place_lng")
    .eq("id", id)
    .single();
  // only re-geocode when the place text actually changed
  const loc =
    existing && existing.place === fields.place
      ? { place_lat: existing.place_lat, place_lng: existing.place_lng }
      : await resolveLocation(fields.place, input.fallbackLatLng);

  const { error } = await supabase.from("entries").update({ ...fields, ...loc }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidateAll();
}

export type PhotoRowInput = {
  id: string;
  storage_path: string;
  width: number;
  height: number;
  taken_at: string | null;
  date_source: DateSource;
  sort_order: number;
};

/** Called after the browser has uploaded the files to storage. */
export async function registerPhotos(entryId: string, photos: PhotoRowInput[]): Promise<void> {
  if (photos.length === 0) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("photos")
    .insert(photos.map((p) => ({ ...p, entry_id: entryId })));
  if (error) throw new Error(error.message);
  revalidateAll();
}

export async function removePhoto(photoId: string): Promise<void> {
  const supabase = await createClient();
  const { data: photo } = await supabase
    .from("photos")
    .select("storage_path")
    .eq("id", photoId)
    .single();
  if (!photo) return;
  await supabase.storage.from("photos").remove([photo.storage_path]);
  const { error } = await supabase.from("photos").delete().eq("id", photoId);
  if (error) throw new Error(error.message);
  revalidateAll();
}

export async function deleteEntry(id: string): Promise<never> {
  const supabase = await createClient();
  const { data: photos } = await supabase.from("photos").select("storage_path").eq("entry_id", id);
  const paths = (photos ?? []).map((p) => p.storage_path);
  if (paths.length) await supabase.storage.from("photos").remove(paths);
  const { error } = await supabase.from("entries").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidateAll();
  redirect("/timeline");
}
