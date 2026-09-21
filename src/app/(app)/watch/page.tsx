import type { Metadata } from "next";
import { getSettings } from "@/lib/data";
import { relationshipYearStart } from "@/lib/dates";
import { fetchSlides } from "@/lib/entries";
import { WatchPlayer } from "./player";

export const metadata: Metadata = { title: "watch" };

export default async function WatchPage({ searchParams }: PageProps<"/watch">) {
  const { year: raw } = await searchParams;
  const year = Number(raw);
  const settings = await getSettings();
  const from = Number.isInteger(year) && year > 0 ? relationshipYearStart(settings.start_date, year) : undefined;
  const to = from ? relationshipYearStart(settings.start_date, year + 1) : undefined;
  const slides = await fetchSlides(from, to);
  return <WatchPlayer slides={slides} label={from ? `year ${year}` : "our whole story"} />;
}
