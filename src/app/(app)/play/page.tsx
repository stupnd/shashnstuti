import type { Metadata } from "next";
import { PlayHub } from "@/components/play/hub";
import { getCurrentProfile, getPartner } from "@/lib/data";

export const metadata: Metadata = { title: "games" };

export default async function PlayPage() {
  const [me, partner] = await Promise.all([getCurrentProfile(), getPartner()]);
  return (
    <PlayHub
      me={{ id: me.id, name: me.display_name, avatar: me.avatar_emoji }}
      partner={partner ? { id: partner.id, name: partner.display_name, avatar: partner.avatar_emoji } : null}
    />
  );
}
