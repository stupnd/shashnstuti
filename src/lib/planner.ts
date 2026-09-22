/**
 * Planner helpers — pure, client-safe. Server queries live in planner-data.ts
 * and the mutations in lib/actions/planner.ts.
 *
 * Every calendar day here is a YYYY-MM-DD string (see lib/dates.ts) so a
 * timezone can never shove a date onto the wrong square.
 */
import { fromDateOnly, toDateOnly } from "@/lib/dates";
import type { Plan, Wish, WishKind } from "@/lib/database.types";

export const MAX_PLAN_TITLE = 80;
export const MAX_WISH_TITLE = 90;
export const MAX_NOTE = 240;

export const WISH_KINDS: { key: WishKind; label: string; plural: string; color: string }[] = [
  { key: "date", label: "date idea", plural: "date ideas", color: "var(--mint)" },
  { key: "present", label: "present", plural: "presents", color: "var(--butter)" },
];

/** "19:30:00" → "7:30 pm". Null/blank → null. */
export function formatTime(at: string | null | undefined): string | null {
  if (!at) return null;
  const [h, m] = at.split(":").map(Number);
  if (Number.isNaN(h)) return null;
  const suffix = h < 12 ? "am" : "pm";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m ? `${hour}:${String(m).padStart(2, "0")} ${suffix}` : `${hour} ${suffix}`;
}

/** "7:30 pm" for an <input type="time"> value ("19:30"). */
export function toTimeInput(at: string | null | undefined): string {
  if (!at) return "";
  const [h, m] = at.split(":");
  return h && m ? `${h}:${m}` : "";
}

export function monthLabel(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

/**
 * The 6×7 grid of days for a month, padded with the neighbouring months so
 * every row is full. Weeks start on Sunday.
 */
export function monthGrid(month: Date): { date: string; inMonth: boolean }[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay());

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    return { date: toDateOnly(d), inMonth: d.getMonth() === month.getMonth() };
  });
}

export function groupByDate<T extends { date: string }>(rows: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const list = map.get(row.date);
    if (list) list.push(row);
    else map.set(row.date, [row]);
  }
  return map;
}

/** Earliest-first, with "sometime that day" plans sorting before timed ones. */
export function sortPlans(plans: Plan[]): Plan[] {
  return [...plans].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    if (a.at_time === b.at_time) return a.created_at < b.created_at ? -1 : 1;
    if (!a.at_time) return -1;
    if (!b.at_time) return 1;
    return a.at_time < b.at_time ? -1 : 1;
  });
}

export function upcomingPlans(plans: Plan[], today: string): Plan[] {
  return sortPlans(plans.filter((p) => p.date >= today && !p.done_at));
}

export function countdownLabel(date: string, today: string): string {
  const days = Math.round(
    (fromDateOnly(date).getTime() - fromDateOnly(today).getTime()) / 86_400_000,
  );
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  if (days < 0) return `${Math.abs(days)} days ago`;
  if (days < 7) return `in ${days} days`;
  if (days < 14) return "next week";
  if (days < 60) return `in ${Math.round(days / 7)} weeks`;
  return `in ${Math.round(days / 30)} months`;
}

/** Anniversaries and birthdays don't live in `plans` — this marks the one we know. */
export function isAnniversaryDay(date: string, startDate: string): boolean {
  return date.slice(5) === startDate.slice(5);
}

export function sortWishes(wishes: Wish[]): Wish[] {
  return [...wishes].sort((a, b) => {
    const aDone = a.done_at ? 1 : 0;
    const bDone = b.done_at ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone; // open ideas float to the top
    return a.created_at < b.created_at ? 1 : -1; // then newest first
  });
}

export function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withProtocol).toString();
  } catch {
    return null;
  }
}

/** "etsy.com" — the bit worth showing on a present chip. */
export function hostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "link";
  }
}
