"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import { getVapidPublicKey } from "@/lib/push";

export async function fetchVapidPublicKey(): Promise<string | null> {
  return getVapidPublicKey();
}

export async function savePushSubscription(input: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}): Promise<{ ok: true } | { error: string }> {
  const endpoint = input.endpoint?.trim();
  const p256dh = input.keys?.p256dh?.trim();
  const auth = input.keys?.auth?.trim();
  if (!endpoint || !p256dh || !auth) return { error: "bad subscription" };

  const me = await getCurrentProfile();
  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      endpoint,
      user_id: me.id,
      p256dh,
      auth,
      user_agent: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" },
  );
  if (error) return { error: error.message };
  return { ok: true };
}

export async function deletePushSubscription(endpoint: string): Promise<{ ok: true } | { error: string }> {
  if (!endpoint) return { error: "missing endpoint" };
  const me = await getCurrentProfile();
  const supabase = await createClient();
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("user_id", me.id);
  if (error) return { error: error.message };
  return { ok: true };
}
