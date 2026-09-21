import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { formatShortDate } from "@/lib/dates";
import { fetchPinnedEntries } from "@/lib/entries";
import { MapView } from "./map-view";

export const metadata: Metadata = { title: "map" };

export type MapPin = {
  id: string;
  lat: number;
  lng: number;
  title: string | null;
  place: string | null;
  date: string;
  milestone: boolean;
  photos: { url: string }[];
};

export default async function MapPage() {
  const entries = await fetchPinnedEntries();
  const pins: MapPin[] = entries
    .filter((e) => e.place_lat != null && e.place_lng != null)
    .map((e) => ({
      id: e.id,
      lat: e.place_lat as number,
      lng: e.place_lng as number,
      title: e.title,
      place: e.place,
      date: formatShortDate(e.date),
      milestone: e.is_milestone,
      photos: e.photos.slice(0, 3).map((p) => ({ url: p.url })),
    }));

  return (
    <main className="animate-fade-up">
      <PageHeader title="our map" caption={`${pins.length} place${pins.length === 1 ? "" : "s"} so far`} />
      <div className="mt-4 h-[calc(100dvh-15rem)] min-h-[360px] overflow-hidden rounded-3xl border border-line">
        {pins.length === 0 ? (
          <div className="flex h-full items-center justify-center px-6 text-center">
            <p className="font-hand text-2xl text-muted">no places yet — add a place to a moment and it&apos;ll show up here.</p>
          </div>
        ) : (
          <MapView pins={pins} />
        )}
      </div>
    </main>
  );
}
