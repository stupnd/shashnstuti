"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import { MAX_HOME_PINS } from "@/lib/home-pins";

export type TogglePinResult =
  | { ok: true; pinned: boolean }
  | { error: string };

export async function toggleHomePin(photoId: string): Promise<TogglePinResult> {
  if (!photoId) return { error: "missing photo" };
  const me = await getCurrentProfile();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("home_pins")
    .select("photo_id")
    .eq("photo_id", photoId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("home_pins").delete().eq("photo_id", photoId);
    if (error) return { error: error.message };
    revalidatePath("/");
    revalidatePath("/pins");
    return { ok: true, pinned: false };
  }

  const { count } = await supabase.from("home_pins").select("photo_id", { count: "exact", head: true });
  if ((count ?? 0) >= MAX_HOME_PINS) {
    return { error: `home is full — unpin one first (max ${MAX_HOME_PINS})` };
  }

  // Confirm the photo exists (and is readable under RLS).
  const { data: photo } = await supabase.from("photos").select("id").eq("id", photoId).maybeSingle();
  if (!photo) return { error: "photo not found" };

  const { error } = await supabase.from("home_pins").insert({
    photo_id: photoId,
    pinned_by: me.id,
    sort_order: count ?? 0,
  });
  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath("/pins");
  return { ok: true, pinned: true };
}
