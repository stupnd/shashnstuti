import type { BaseState, Seat } from "./types";
import { emptySeats } from "./types";

export const C4_COLS = 7;
export const C4_ROWS = 6;

export type Connect4State = BaseState & {
  /** Column-major: board[col][row], row 0 is the bottom. */
  board: (Seat | null)[][];
};

function emptyBoard(): (Seat | null)[][] {
  return Array.from({ length: C4_COLS }, () => Array(C4_ROWS).fill(null));
}

export function freshConnect4(): Connect4State {
  return {
    seats: emptySeats(),
    turn: "a",
    status: "waiting",
    winner: null,
    version: 0,
    board: emptyBoard(),
  };
}

export function parseConnect4(raw: unknown): Connect4State {
  const s = (raw ?? {}) as Partial<Connect4State>;
  let board = emptyBoard();
  if (Array.isArray(s.board) && s.board.length === C4_COLS) {
    board = s.board.map((col) => {
      if (!Array.isArray(col) || col.length !== C4_ROWS) return Array(C4_ROWS).fill(null);
      return col.map((c) => (c === "a" || c === "b" ? c : null));
    });
  }
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

function dropRow(col: (Seat | null)[]): number {
  for (let r = 0; r < C4_ROWS; r++) if (!col[r]) return r;
  return -1;
}

function checkWin(board: (Seat | null)[][], col: number, row: number, who: Seat): boolean {
  const dirs: [number, number][] = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ];
  for (const [dc, dr] of dirs) {
    let n = 1;
    for (const sign of [1, -1]) {
      for (let i = 1; i < 4; i++) {
        const c = col + dc * sign * i;
        const r = row + dr * sign * i;
        if (c < 0 || c >= C4_COLS || r < 0 || r >= C4_ROWS || board[c][r] !== who) break;
        n++;
      }
    }
    if (n >= 4) return true;
  }
  return false;
}

export function playConnect4(state: Connect4State, col: number, by: Seat): Connect4State | null {
  if (state.status !== "playing" || state.turn !== by) return null;
  if (col < 0 || col >= C4_COLS) return null;
  const row = dropRow(state.board[col]);
  if (row < 0) return null;

  const board = state.board.map((c) => c.slice());
  board[col][row] = by;

  if (checkWin(board, col, row, by)) {
    return { ...state, board, version: state.version + 1, status: "finished", winner: by, turn: by };
  }
  const full = board.every((c) => c.every(Boolean));
  if (full) {
    return { ...state, board, version: state.version + 1, status: "finished", winner: "draw", turn: by };
  }
  return {
    ...state,
    board,
    version: state.version + 1,
    turn: by === "a" ? "b" : "a",
  };
}
