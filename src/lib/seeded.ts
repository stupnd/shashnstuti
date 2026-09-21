/** Deterministic "random" in [-1, 1] from a string, so layouts don't jump between renders. */
export function seeded(id: string, salt = 0): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return ((h >>> 0) % 2000) / 1000 - 1;
}

export function excerpt(text: string, max = 90): string {
  const t = text.trim().replace(/\s+/g, " ");
  return t.length > max ? t.slice(0, max).trimEnd() + "…" : t;
}
