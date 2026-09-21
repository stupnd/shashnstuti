"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Avatar } from "@/components/ui";
import { Icon } from "@/components/icons";
import type { BaseState, PlayerInfo, Seat } from "@/lib/play/types";

export function PlayShell({
  title,
  color,
  children,
  footer,
}: {
  title: string;
  color: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-[100dvh] flex-col px-1 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(0.75rem+env(safe-area-inset-top))]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link href="/play" transitionTypes={["nav-back"]} className="label inline-flex items-center gap-1 hover:text-ink">
          <Icon name="back" size={14} /> games
        </Link>
        <span className="chip text-[11px] uppercase tracking-wider" style={{ background: color }}>
          live
        </span>
      </div>
      <h1 className="font-marker text-[2rem] leading-tight">
        <span className="hl" style={{ ["--hl" as string]: color }}>{title}</span>
      </h1>
      <div className="mt-6 flex-1">{children}</div>
      {footer && <div className="mt-6 flex flex-wrap items-center justify-center gap-2">{footer}</div>}
    </div>
  );
}

export function SeatBanner({
  state,
  me,
  partner,
  mySeat,
  markA = "you",
  markB = "them",
  statusText,
}: {
  state: BaseState;
  me: PlayerInfo;
  partner: PlayerInfo;
  mySeat: Seat | null;
  markA?: string;
  markB?: string;
  /** Override the turn/winner line (e.g. simultaneous games). */
  statusText?: string;
}) {
  if (state.status === "waiting") {
    return (
      <p className="card mb-5 p-4 text-center text-sm" style={{ ["--card-shadow" as string]: "var(--lilac)" }}>
        open this game on {partner.name}&apos;s phone too — moves sync live.
      </p>
    );
  }

  const nameFor = (seat: Seat) => {
    if (state.seats[seat] === me.id) return me.name;
    if (state.seats[seat] === partner.id) return partner.name;
    return seat === "a" ? markA : markB;
  };

  const avatarFor = (seat: Seat) => {
    if (state.seats[seat] === me.id) return me.avatar;
    if (state.seats[seat] === partner.id) return partner.avatar;
    return "🤍";
  };

  const status =
    statusText ??
    (state.status === "finished"
      ? state.winner === "draw"
        ? "it's a draw"
        : `${nameFor(state.winner as Seat)} wins!`
      : mySeat === state.turn
        ? "your turn"
        : `${nameFor(state.turn)}'s turn`);

  return (
    <div className="mb-5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <SeatChip active={!statusText && state.turn === "a" && state.status === "playing"} avatar={avatarFor("a")} label={nameFor("a")} mark={markA} color="var(--pink)" />
        <span className="text-xs font-bold text-muted">vs</span>
        <SeatChip active={!statusText && state.turn === "b" && state.status === "playing"} avatar={avatarFor("b")} label={nameFor("b")} mark={markB} color="var(--sky)" />
      </div>
      <p className="font-hand text-xl leading-none text-ink">{status}</p>
    </div>
  );
}

function SeatChip({
  active,
  avatar,
  label,
  mark,
  color,
}: {
  active: boolean;
  avatar: string;
  label: string;
  mark: string;
  color: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${active ? "ring-2 ring-ink" : "opacity-70"}`}
      style={{ background: color }}
    >
      <Avatar value={avatar} size={16} />
      <span className="max-w-[4.5rem] truncate">{label}</span>
      <span className="text-[10px] uppercase tracking-wide text-muted">{mark}</span>
    </span>
  );
}

export function NewGameButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="btn btn-soft" onClick={onClick}>
      new game
    </button>
  );
}
