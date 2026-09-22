import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Plan, Wish } from "@/lib/database.types";

/**
 * Both tables are tiny by nature — two people planning dates and jotting
 * present ideas — so each page loads all of its own rows and slices them on
 * the client. If `plans` ever passes a few hundred rows, switch fetchPlans to
 * a date-range query keyed off the visible month.
 *
 * `ready` is false until supabase/migrations/…_planner.sql has been run, so
 * the pages can say so instead of crashing.
 */

/** PostgREST's "that table isn't in the schema" codes. */
function isMissingTable(error: { code?: string } | null): boolean {
  return error?.code === "42P01" || error?.code === "PGRST205";
}

export async function fetchPlans(): Promise<{ plans: Plan[]; ready: boolean }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("plans")
    .select("*")
    .order("date", { ascending: true })
    .order("at_time", { ascending: true, nullsFirst: true });

  if (isMissingTable(error)) return { plans: [], ready: false };
  if (error) throw new Error(error.message);
  return { plans: data ?? [], ready: true };
}

export async function fetchWishes(): Promise<{ wishes: Wish[]; ready: boolean }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("wishes")
    .select("*")
    .order("created_at", { ascending: false });

  if (isMissingTable(error)) return { wishes: [], ready: false };
  if (error) throw new Error(error.message);
  return { wishes: data ?? [], ready: true };
}

/** Open counts for the wishlist card on the calendar page. */
export async function fetchWishCounts(): Promise<{ present: number; date: number }> {
  const supabase = await createClient();
  const [present, dates] = await Promise.all([
    supabase
      .from("wishes")
      .select("id", { count: "exact", head: true })
      .eq("kind", "present")
      .is("done_at", null),
    supabase
      .from("wishes")
      .select("id", { count: "exact", head: true })
      .eq("kind", "date")
      .is("done_at", null),
  ]);
  return { present: present.count ?? 0, date: dates.count ?? 0 };
}
