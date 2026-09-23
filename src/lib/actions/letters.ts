"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getPartner } from "@/lib/data";
import { notifyPartner } from "@/lib/push";

export type LetterState = { error?: string };

export async function writeLetter(_prev: LetterState, formData: FormData): Promise<LetterState> {
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const unlockDate = String(formData.get("unlock_date") ?? "").trim();
  if (!title) return { error: "Give it a title — 'open when you miss me' style." };
  if (!body) return { error: "Write something, even one line." };

  const [me, partner] = await Promise.all([getCurrentProfile(), getPartner()]);
  if (!partner) return { error: "He hasn't logged in yet, so there's nobody to send it to." };

  // Unlocks at local midnight of the chosen day.
  const unlock_at = unlockDate ? new Date(`${unlockDate}T00:00:00`).toISOString() : null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("letters")
    .insert({ title, body, author: me.id, recipient: partner.id, unlock_at });
  if (error) return { error: error.message };

  await notifyPartner(partner.id, {
    title: "you've got mail ♡",
    body: title,
    url: "/letters",
    tag: "letter",
  });

  revalidatePath("/letters");
  redirect("/letters");
}

export async function openLetter(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("open_letter", { p_id: id });
  if (error) throw new Error(error.message);
  revalidatePath("/letters");
  revalidatePath(`/letters/${id}`);
}

export async function deleteLetter(id: string): Promise<never> {
  const supabase = await createClient();
  const { error } = await supabase.from("letters").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/letters");
  redirect("/letters");
}
