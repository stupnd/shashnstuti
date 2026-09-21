import type { BaseState, Seat } from "./types";
import { emptySeats } from "./types";

export type Cell = Seat | null;

export type TttState = BaseState & {
  board: Cell[];
};

const WINS = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function freshTtt(): TttState {
  return {
    seats: emptySeats(),
    turn: "a",
    status: "waiting",
    winner: null,
    version: 0,
    board: Array(9).fill(null),
  };
}

export function parseTtt(raw: unknown): TttState {
  const s = (raw ?? {}) as Partial<TttState>;
  const board = Array.isArray(s.board) && s.board.length === 9 ? (s.board as Cell[]) : Array(9).fill(null);
  return {
    seats: s.seats ?? emptySeats(),
    turn: s.turn === "b" ? "b" : "a",
    status: s.status === "playing" || s.status === "finished" ? s.status : "waiting",
    winner: s.winner === "a" || s.winner === "b" || s.winner === "draw" ? s.winner : null,
    version: typeof s.version === "number" ? s.version : 0,
    scored: Boolean(s.scored),
    board,
  };
}

function winnerOf(board: Cell[]): Seat | "draw" | null {
  for (const [a, b, c] of WINS) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  if (board.every(Boolean)) return "draw";
  return null;
}

export function playTtt(state: TttState, index: number, by: Seat): TttState | null {
  if (state.status !== "playing" || state.turn !== by) return null;
  if (index < 0 || index > 8 || state.board[index]) return null;
  const board = state.board.slice();
  board[index] = by;
  const winner = winnerOf(board);
  return {
    ...state,
    board,
    version: state.version + 1,
    turn: by === "a" ? "b" : "a",
    status: winner ? "finished" : "playing",
    winner,
  };
}
