/**
 * The two of you. The `email` is an internal Supabase identity — nobody ever
 * emails it — it just has to match `allowed_emails` in the seed migration.
 * Display names and avatars are edited in Settings, not here.
 */
export const PEOPLE = [
  { key: "stuti", email: "stuti@journal.local", label: "Stuti" },
  { key: "shash", email: "shash@journal.local", label: "Shash" },
] as const;

export type PersonKey = (typeof PEOPLE)[number]["key"];

export function findPerson(key: string) {
  return PEOPLE.find((p) => p.key === key) ?? null;
}
