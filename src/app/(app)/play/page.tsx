import type { Metadata } from "next";
import { PlayHub } from "@/components/play/hub";
import { getPartner } from "@/lib/data";

export const metadata: Metadata = { title: "games" };

export default async function PlayPage() {
  const partner = await getPartner();
  return <PlayHub partnerName={partner?.display_name ?? null} />;
}
