import type { Metadata } from "next";
import { getCurrentProfile } from "@/lib/data";
import { fetchEntriesPage } from "@/lib/entries";
import { Deck } from "./deck";

export const metadata: Metadata = { title: "flip" };

export default async function FlipPage({ searchParams }: PageProps<"/flip">) {
  const { shuffle } = await searchParams;
  const [me, page] = await Promise.all([getCurrentProfile(), fetchEntriesPage({ limit: 30 })]);
  return <Deck initial={page.entries} initialCursor={page.next} meId={me.id} shuffle={shuffle === "1"} />;
}
