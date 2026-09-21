import type { BaseState, Seat } from "./types";
import { emptySeats } from "./types";

export type Choice = "rock" | "paper" | "scissors";
export const CHOICES: { id: Choice; label: string; beat: Choice }[] = [
  { id: "rock", label: "rock", beat: "scissors" },
  { id: "paper", label: "paper", beat: "rock" },
  { id: "scissors", label: "scissors", beat: "paper" },
];

export const SHOWDOWN_TARGET = 3;

export type ShowdownState = BaseState & {
  picks: Partial<Record<Seat, Choice>>;
  scores: Record<Seat, number>;
  /** Last resolved round, shown briefly. */
  last?: { a: Choice; b: Choice; winner: Seat | "draw" } | null;
};

export function freshShowdown(): ShowdownState {
  return {
    seats: emptySeats(),
    turn: "a", // unused for simultaneous — both can pick
    status: "waiting",
    winner: null,
    version: 0,
    picks: {},
    scores: { a: 0, b: 0 },
    last: null,
  };
}

function asChoice(x: unknown): Choice | undefined {
  return x === "rock" || x === "paper" || x === "scissors" ? x : undefined;
}

export function parseShowdown(raw: unknown): ShowdownState {
  const s = (raw ?? {}) as Partial<ShowdownState>;
  return {
    seats: s.seats ?? emptySeats(),
    turn: s.turn === "b" ? "b" : "a",
    status: s.status === "playing" || s.status === "finished" ? s.status : "waiting",
    winner: s.winner === "a" || s.winner === "b" || s.winner === "draw" ? s.winner : null,
    version: typeof s.version === "number" ? s.version : 0,
    scored: Boolean(s.scored),
    picks: {
      a: asChoice(s.picks?.a),
      b: asChoice(s.picks?.b),
    },
    scores: {
      a: typeof s.scores?.a === "number" ? s.scores.a : 0,
      b: typeof s.scores?.b === "number" ? s.scores.b : 0,
    },
    last:
      s.last && asChoice(s.last.a) && asChoice(s.last.b)
        ? {
            a: asChoice(s.last.a)!,
            b: asChoice(s.last.b)!,
            winner: s.last.winner === "a" || s.last.winner === "b" || s.last.winner === "draw" ? s.last.winner : "draw",
          }
        : null,
  };
}

function roundWinner(a: Choice, b: Choice): Seat | "draw" {
  if (a === b) return "draw";
  const entry = CHOICES.find((c) => c.id === a)!;
  return entry.beat === b ? "a" : "b";
}

/** Apply my pick onto the latest state (merge-safe). */
export function pickShowdown(state: ShowdownState, by: Seat, choice: Choice): ShowdownState | null {
  if (state.status !== "playing") return null;
  if (state.picks[by]) return null; // already locked in this round

  const picks = { ...state.picks, [by]: choice };
  const other: Seat = by === "a" ? "b" : "a";
  const theirs = picks[other];

  if (!theirs) {
    return { ...state, picks, version: state.version + 1, last: null };
  }

  // Both in — resolve.
  const a = by === "a" ? choice : theirs;
  const b = by === "b" ? choice : theirs;
  const winner = roundWinner(a, b);
  const scores = { ...state.scores };
  if (winner === "a") scores.a += 1;
  if (winner === "b") scores.b += 1;

  const done = scores.a >= SHOWDOWN_TARGET || scores.b >= SHOWDOWN_TARGET;
  let matchWinner: ShowdownState["winner"] = null;
  if (done) {
    matchWinner = scores.a > scores.b ? "a" : scores.b > scores.a ? "b" : "draw";
  }

  return {
    ...state,
    picks: {},
    scores,
    last: { a, b, winner },
    version: state.version + 1,
    status: done ? "finished" : "playing",
    winner: matchWinner,
  };
}
