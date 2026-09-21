import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ConnectFour } from "@/components/play/connect4-game";
import { MemoryGame } from "@/components/play/memory-game";
import { TicTacToe } from "@/components/play/ttt-game";
import { getCurrentProfile, getPartner } from "@/lib/data";
import { getGame, type PlayMode } from "@/lib/play/types";

export async function generateMetadata({ params }: PageProps<"/play/[game]">): Promise<Metadata> {
  const { game } = await params;
  const meta = getGame(game);
  return { title: meta?.title ?? "game" };
}

export default async function GamePage({ params, searchParams }: PageProps<"/play/[game]">) {
  const [{ game }, sp, me, partner] = await Promise.all([
    params,
    searchParams,
    getCurrentProfile(),
    getPartner(),
  ]);

  const meta = getGame(game);
  if (!meta) notFound();

  const mode: PlayMode = sp.mode === "online" ? "online" : "pass";
  if (mode === "online" && !partner) redirect("/play");

  const meInfo = { id: me.id, name: me.display_name, avatar: me.avatar_emoji };
  const partnerInfo = partner
    ? { id: partner.id, name: partner.display_name, avatar: partner.avatar_emoji }
    : null;

  if (meta.id === "ttt") return <TicTacToe mode={mode} me={meInfo} partner={partnerInfo} />;
  if (meta.id === "connect4") return <ConnectFour mode={mode} me={meInfo} partner={partnerInfo} />;
  return <MemoryGame mode={mode} me={meInfo} partner={partnerInfo} />;
}
