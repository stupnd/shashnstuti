import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ConnectFour } from "@/components/play/connect4-game";
import { DotsGame } from "@/components/play/dots-game";
import { ShowdownGame } from "@/components/play/showdown-game";
import { TicTacToe } from "@/components/play/ttt-game";
import { getCurrentProfile, getPartner } from "@/lib/data";
import { getGame } from "@/lib/play/types";

export async function generateMetadata({ params }: PageProps<"/play/[game]">): Promise<Metadata> {
  const { game } = await params;
  const meta = getGame(game);
  return { title: meta?.title ?? "game" };
}

export default async function GamePage({ params }: PageProps<"/play/[game]">) {
  const [{ game }, me, partner] = await Promise.all([params, getCurrentProfile(), getPartner()]);

  const meta = getGame(game);
  if (!meta) notFound();
  if (!partner) redirect("/play");

  const meInfo = { id: me.id, name: me.display_name, avatar: me.avatar_emoji };
  const partnerInfo = { id: partner.id, name: partner.display_name, avatar: partner.avatar_emoji };

  if (meta.id === "ttt") return <TicTacToe me={meInfo} partner={partnerInfo} />;
  if (meta.id === "connect4") return <ConnectFour me={meInfo} partner={partnerInfo} />;
  if (meta.id === "dots") return <DotsGame me={meInfo} partner={partnerInfo} />;
  return <ShowdownGame me={meInfo} partner={partnerInfo} />;
}
