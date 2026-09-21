import type { IconName } from "@/components/icons";

export type GameId = "ttt" | "connect4" | "memory";
export type PlayMode = "pass" | "online";
export type Seat = "a" | "b";

export type GameMeta = {
  id: GameId;
  title: string;
  blurb: string;
  icon: IconName;
  color: string;
};

export const GAMES: GameMeta[] = [
  {
    id: "ttt",
    title: "tic-tac-toe",
    blurb: "three in a row. classic.",
    icon: "star",
    color: "var(--butter)",
  },
  {
    id: "connect4",
    title: "connect four",
    blurb: "drop discs. get four.",
    icon: "dice",
    color: "var(--sky)",
  },
  {
    id: "memory",
    title: "memory",
    blurb: "flip pairs. most wins.",
    icon: "eyes",
    color: "var(--mint)",
  },
];

export function getGame(id: string): GameMeta | null {
  return GAMES.find((g) => g.id === id) ?? null;
}

export type PlayerInfo = {
  id: string;
  name: string;
  avatar: string;
};

/** Shared shape every synced game stores in `game_sessions.state`. */
export type BaseState = {
  seats: Partial<Record<Seat, string>>;
  turn: Seat;
  status: "waiting" | "playing" | "finished";
  winner: Seat | "draw" | null;
  version: number;
  /** Set once after the finish is written to the scoreboard (avoids double-count). */
  scored?: boolean;
};

export function emptySeats(): BaseState["seats"] {
  return {};
}

export function seatOf(seats: BaseState["seats"], playerId: string): Seat | null {
  if (seats.a === playerId) return "a";
  if (seats.b === playerId) return "b";
  return null;
}
