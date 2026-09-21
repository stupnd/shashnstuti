"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";

export async function saveWrappedCustom(year: number, slot: number, label: string, value: string): Promise<void> {
  const me = await getCurrentProfile();
  const supabase = await createClient();
  const { error } = await supabase.from("wrapped_custom").upsert({
    year,
    slot,
    label: label.trim().slice(0, 60),
    value: value.trim().slice(0, 300),
    updated_by: me.id,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/wrapped/${year}`);
}
