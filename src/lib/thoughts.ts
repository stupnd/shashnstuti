export const THOUGHTS_SESSION_ID = "thoughts";
export const MAX_THOUGHTS = 40;
export const MAX_THOUGHT_LEN = 160;

export type Thought = {
  id: string;
  author: string;
  body: string;
  created_at: string;
};

export type ThoughtsState = { items: Thought[] };

export function emptyThoughts(): ThoughtsState {
  return { items: [] };
}

export function parseThoughts(raw: unknown): ThoughtsState {
  if (!raw || typeof raw !== "object") return emptyThoughts();
  const items = (raw as { items?: unknown }).items;
  if (!Array.isArray(items)) return emptyThoughts();
  const cleaned: Thought[] = [];
  for (const row of items) {
    if (!row || typeof row !== "object") continue;
    const t = row as Partial<Thought>;
    if (typeof t.id !== "string" || typeof t.author !== "string" || typeof t.body !== "string" || typeof t.created_at !== "string") continue;
    const body = t.body.trim();
    if (!body) continue;
    cleaned.push({ id: t.id, author: t.author, body: body.slice(0, MAX_THOUGHT_LEN), created_at: t.created_at });
  }
  return { items: cleaned.slice(0, MAX_THOUGHTS) };
}
