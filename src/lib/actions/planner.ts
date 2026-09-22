"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/data";
import { MAX_NOTE, MAX_PLAN_TITLE, MAX_WISH_TITLE, normalizeUrl } from "@/lib/planner";
import type { Plan, Wish, WishKind } from "@/lib/database.types";

type Fail = { error: string };
export type PlanResult = { ok: true; plan: Plan } | Fail;
export type WishResult = { ok: true; wish: Wish } | Fail;
export type OkResult = { ok: true } | Fail;

/** Both people share the planner, so every page that shows it gets refreshed. */
function refresh() {
  revalidatePath("/planner");
  revalidatePath("/");
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

export async function addPlan(input: {
  date: string;
  title: string;
  time?: string;
  note?: string;
  place?: string;
}): Promise<PlanResult> {
  const title = input.title.trim().slice(0, MAX_PLAN_TITLE);
  const date = input.date.trim();
  if (!title) return { error: "give the date a name" };
  if (!DATE_RE.test(date)) return { error: "pick a day first" };

  const time = input.time?.trim() ?? "";
  if (time && !TIME_RE.test(time)) return { error: "that time looks off" };

  const me = await getCurrentProfile();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("plans")
    .insert({
      date,
      title,
      at_time: time ? `${time}:00` : null,
      note: (input.note ?? "").trim().slice(0, MAX_NOTE),
      place: input.place?.trim() || null,
      created_by: me.id,
    })
    .select("*")
    .single();
  if (error) return { error: error.message };

  refresh();
  return { ok: true, plan: data };
}

export async function updatePlan(
  id: string,
  patch: { date?: string; title?: string; time?: string | null; note?: string; place?: string | null },
): Promise<PlanResult> {
  if (!id) return { error: "missing plan" };

  const next: Partial<Plan> = {};
  if (patch.title !== undefined) {
    const title = patch.title.trim().slice(0, MAX_PLAN_TITLE);
    if (!title) return { error: "give the date a name" };
    next.title = title;
  }
  if (patch.date !== undefined) {
    if (!DATE_RE.test(patch.date)) return { error: "that day looks off" };
    next.date = patch.date;
  }
  if (patch.time !== undefined) {
    if (patch.time && !TIME_RE.test(patch.time)) return { error: "that time looks off" };
    next.at_time = patch.time ? `${patch.time}:00` : null;
  }
  if (patch.note !== undefined) next.note = patch.note.trim().slice(0, MAX_NOTE);
  if (patch.place !== undefined) next.place = patch.place?.trim() || null;
  if (Object.keys(next).length === 0) return { error: "nothing to change" };

  const supabase = await createClient();
  const { data, error } = await supabase.from("plans").update(next).eq("id", id).select("*").single();
  if (error) return { error: error.message };

  refresh();
  return { ok: true, plan: data };
}

/** Tick a date off once it's happened (or un-tick it). */
export async function togglePlanDone(id: string, done: boolean): Promise<PlanResult> {
  if (!id) return { error: "missing plan" };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("plans")
    .update({ done_at: done ? new Date().toISOString() : null })
    .eq("id", id)
    .select("*")
    .single();
  if (error) return { error: error.message };

  refresh();
  return { ok: true, plan: data };
}

export async function deletePlan(id: string): Promise<OkResult> {
  if (!id) return { error: "missing plan" };
  const supabase = await createClient();
  const { error } = await supabase.from("plans").delete().eq("id", id);
  if (error) return { error: error.message };

  refresh();
  return { ok: true };
}

export async function addWish(input: {
  kind: WishKind;
  title: string;
  note?: string;
  url?: string;
  forId?: string | null;
}): Promise<WishResult> {
  const title = input.title.trim().slice(0, MAX_WISH_TITLE);
  if (!title) return { error: "what's the idea?" };
  if (input.kind !== "present" && input.kind !== "date") return { error: "unknown kind" };

  const rawUrl = (input.url ?? "").trim();
  const url = rawUrl ? normalizeUrl(rawUrl) : null;
  if (rawUrl && !url) return { error: "that link doesn't look right" };

  const me = await getCurrentProfile();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("wishes")
    .insert({
      kind: input.kind,
      title,
      note: (input.note ?? "").trim().slice(0, MAX_NOTE),
      url,
      for_id: input.forId ?? null,
      created_by: me.id,
    })
    .select("*")
    .single();
  if (error) return { error: error.message };

  refresh();
  return { ok: true, wish: data };
}

/** Got the present / did the date. */
export async function toggleWishDone(id: string, done: boolean): Promise<WishResult> {
  if (!id) return { error: "missing idea" };
  const me = await getCurrentProfile();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("wishes")
    .update({
      done_at: done ? new Date().toISOString() : null,
      done_by: done ? me.id : null,
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) return { error: error.message };

  refresh();
  return { ok: true, wish: data };
}

export async function deleteWish(id: string): Promise<OkResult> {
  if (!id) return { error: "missing idea" };
  const supabase = await createClient();
  const { error } = await supabase.from("wishes").delete().eq("id", id);
  if (error) return { error: error.message };

  refresh();
  return { ok: true };
}

/**
 * Move a date idea off the wishlist and onto the calendar: creates the plan,
 * then marks the idea done so it stops cluttering the list.
 */
export async function scheduleWish(
  id: string,
  date: string,
  time?: string,
): Promise<PlanResult> {
  const supabase = await createClient();
  const { data: wish, error: wishErr } = await supabase
    .from("wishes")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (wishErr) return { error: wishErr.message };
  if (!wish) return { error: "idea not found" };

  const created = await addPlan({
    date,
    time,
    title: wish.title,
    note: wish.note,
  });
  if ("error" in created) return created;

  const me = await getCurrentProfile();
  await supabase
    .from("wishes")
    .update({ done_at: new Date().toISOString(), done_by: me.id })
    .eq("id", id);

  refresh();
  return created;
}
