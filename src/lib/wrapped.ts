import { createClient } from "@/lib/supabase/server";
import { getProfiles } from "@/lib/data";
import { relationshipYearStart, fromDateOnly } from "@/lib/dates";
import { signPhotoUrls } from "@/lib/entries";
import type { WrappedCustom } from "@/lib/database.types";

export type WrappedStats = {
  year: number;
  from: string;
  to: string;
  moments: number;
  photos: number;
  topPlace: { name: string; count: number } | null;
  topTag: { name: string; count: number } | null;
  topMood: { name: string; count: number } | null;
  authors: { name: string; emoji: string; count: number }[];
  busiestMonth: { label: string; count: number } | null;
  milestones: { id: string; title: string | null; note: string; date: string; url: string | null }[];
  custom: WrappedCustom[];
  customTableMissing: boolean;
};

function mode(values: (string | null | undefined)[]): { name: string; count: number } | null {
  const counts = new Map<string, number>();
  for (const v of values) if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: { name: string; count: number } | null = null;
  for (const [name, count] of counts) if (!best || count > best.count) best = { name, count };
  return best;
}

export async function computeWrapped(startDate: string, year: number): Promise<WrappedStats> {
  const supabase = await createClient();
  const from = relationshipYearStart(startDate, year);
  const to = relationshipYearStart(startDate, year + 1);

  const [{ data: entries }, profiles, customRes] = await Promise.all([
    supabase
      .from("entries")
      .select("id, date, title, note, place, mood, tags, author, is_milestone, photos(id, storage_path, sort_order)")
      .gte("date", from)
      .lt("date", to)
      .order("date"),
    getProfiles(),
    supabase.from("wrapped_custom").select("*").eq("year", year).order("slot"),
  ]);

  const rows = entries ?? [];
  const photos = rows.reduce((n, e) => n + (e.photos?.length ?? 0), 0);

  const authorCounts = new Map<string, number>();
  for (const e of rows) authorCounts.set(e.author, (authorCounts.get(e.author) ?? 0) + 1);
  const authors = profiles
    .map((p) => ({ name: p.display_name, emoji: p.avatar_emoji, count: authorCounts.get(p.id) ?? 0 }))
    .sort((a, b) => b.count - a.count);

  const monthCounts = new Map<string, number>();
  for (const e of rows) {
    const k = e.date.slice(0, 7);
    monthCounts.set(k, (monthCounts.get(k) ?? 0) + 1);
  }
  let busiest: { label: string; count: number } | null = null;
  for (const [k, count] of monthCounts) {
    if (!busiest || count > busiest.count) {
      busiest = {
        label: fromDateOnly(`${k}-01`).toLocaleDateString("en-US", { month: "long", year: "numeric" }),
        count,
      };
    }
  }

  const milestoneRows = rows.filter((e) => e.is_milestone).slice(0, 6);
  const paths = milestoneRows
    .map((e) => [...(e.photos ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0]?.storage_path)
    .filter(Boolean) as string[];
  const urls = await signPhotoUrls(supabase, paths);
  const milestones = milestoneRows.map((e) => {
    const cover = [...(e.photos ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0]?.storage_path;
    return { id: e.id, title: e.title, note: e.note, date: e.date, url: cover ? (urls.get(cover) ?? null) : null };
  });

  return {
    year,
    from,
    to,
    moments: rows.length,
    photos,
    topPlace: mode(rows.map((e) => e.place)),
    topTag: mode(rows.flatMap((e) => e.tags)),
    topMood: mode(rows.map((e) => e.mood)),
    authors,
    busiestMonth: busiest,
    milestones,
    custom: customRes.data ?? [],
    customTableMissing: Boolean(customRes.error && /wrapped_custom/.test(customRes.error.message)),
  };
}

/** Which relationship years exist so far (1..current). */
export async function yearsSoFar(startDate: string, today: string): Promise<{ year: number; moments: number }[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("entries").select("date");
  const years: { year: number; moments: number }[] = [];
  for (let y = 1; relationshipYearStart(startDate, y) <= today; y++) {
    const from = relationshipYearStart(startDate, y);
    const to = relationshipYearStart(startDate, y + 1);
    years.push({ year: y, moments: (data ?? []).filter((e) => e.date >= from && e.date < to).length });
  }
  return years.reverse();
}
