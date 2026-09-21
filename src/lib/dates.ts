/**
 * Relationship date maths. All "dates" here are calendar days (YYYY-MM-DD)
 * so that timezones never shift a moment onto the wrong day.
 */

export function toDateOnly(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse YYYY-MM-DD as a local-time Date at midnight. */
export function fromDateOnly(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayDateOnly(): string {
  return toDateOnly(new Date());
}

const MS_PER_DAY = 86_400_000;

function daysBetween(a: string, b: string): number {
  const utcA = Date.UTC(...ymd(a));
  const utcB = Date.UTC(...ymd(b));
  return Math.round((utcB - utcA) / MS_PER_DAY);
}

function ymd(s: string): [number, number, number] {
  const [y, m, d] = s.split("-").map(Number);
  return [y, m - 1, d];
}

/** "day 1" is the start date itself. */
export function dayOfUs(startDate: string, today = todayDateOnly()): number {
  return daysBetween(startDate, today) + 1;
}

/** Which relationship year a given date falls in (1-based). */
export function relationshipYear(startDate: string, date: string): number {
  const [sy, sm, sd] = ymd(startDate);
  const [y, m, d] = ymd(date);
  let years = y - sy;
  if (m < sm || (m === sm && d < sd)) years -= 1;
  return Math.max(1, years + 1);
}

/** The first day of a relationship year (year 1 starts on the start date). */
export function relationshipYearStart(startDate: string, year: number): string {
  const [sy, sm, sd] = ymd(startDate);
  return toDateOnly(new Date(sy + year - 1, sm, sd));
}

export function nextAnniversary(
  startDate: string,
  today = todayDateOnly(),
): { date: string; years: number; daysUntil: number } {
  const [sy, sm, sd] = ymd(startDate);
  const [ty] = ymd(today);
  let candidate = toDateOnly(new Date(ty, sm, sd));
  let years = ty - sy;
  if (daysBetween(today, candidate) < 0) {
    candidate = toDateOnly(new Date(ty + 1, sm, sd));
    years += 1;
  }
  return { date: candidate, years, daysUntil: daysBetween(today, candidate) };
}

export function formatLongDate(dateOnly: string): string {
  return fromDateOnly(dateOnly).toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatShortDate(dateOnly: string): string {
  return fromDateOnly(dateOnly).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
