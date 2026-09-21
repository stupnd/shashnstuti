import "server-only";

export type GeoPoint = { lat: number; lng: number };

/**
 * Place name → coordinates via OpenStreetMap's Nominatim. Free, no key,
 * but be polite: one request per save, identified User-Agent, cached a month.
 * Returns null when nothing matches — the entry is still saved, just unpinned.
 */
export async function geocode(place: string): Promise<GeoPoint | null> {
  const q = place.trim();
  if (!q) return null;
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", q);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", "1");
    const res = await fetch(url, {
      headers: { "User-Agent": "us-journal/1.0 (private couple scrapbook)" },
      next: { revalidate: 60 * 60 * 24 * 30 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { lat: string; lon: string }[];
    if (!data[0]) return null;
    return { lat: Number(data[0].lat), lng: Number(data[0].lon) };
  } catch {
    return null;
  }
}
