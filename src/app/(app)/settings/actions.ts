"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";

export type SettingsState = { ok?: boolean; error?: string };

export async function updateProfile(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const display_name = String(formData.get("display_name") ?? "").trim();
  const avatar_emoji = String(formData.get("avatar_emoji") ?? "").trim();
  if (!display_name) return { error: "Pick a name, even a silly one." };
  if (!avatar_emoji) return { error: "Pick an emoji." };

  const me = await getCurrentProfile();
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ display_name, avatar_emoji })
    .eq("id", me.id);

  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateStartDate(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const start_date = String(formData.get("start_date") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start_date)) {
    return { error: "That date looks off." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("settings")
    .update({ start_date, updated_at: new Date().toISOString() })
    .eq("id", 1);

  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateSpotifyUrl(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const raw = String(formData.get("spotify_url") ?? "").trim();
  let spotify_url: string | null = null;
  if (raw) {
    const { isValidSpotifyUrl, parseSpotifyEmbed } = await import("@/lib/spotify");
    if (!isValidSpotifyUrl(raw)) {
      return { error: "paste a spotify playlist, album, or track link" };
    }
    spotify_url = parseSpotifyEmbed(raw)!.openUrl;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("settings")
    .update({ spotify_url, updated_at: new Date().toISOString() })
    .eq("id", 1);

  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}
