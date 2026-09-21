import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSettings } from "@/lib/data";
import { computeWrapped } from "@/lib/wrapped";
import { WrappedSlides } from "./slides";

export const metadata: Metadata = { title: "wrapped" };

export default async function WrappedYearPage({ params }: PageProps<"/wrapped/[year]">) {
  const { year: raw } = await params;
  const year = Number(raw);
  if (!Number.isInteger(year) || year < 1 || year > 60) notFound();
  const settings = await getSettings();
  const stats = await computeWrapped(settings.start_date, year);
  return <WrappedSlides stats={stats} />;
}
