import type { BaseState, Seat } from "./types";
import { emptySeats } from "./types";

export const MEMORY_EMOJIS = ["🍓", "🌙", "⭐", "🦋", "🍀", "🎈", "🐱", "🌈"];

export type MemoryCard = {
  id: number;
  emoji: string;
  matchedBy: Seat | null;
};

export type MemoryState = BaseState & {
  cards: MemoryCard[];
  scores: Record<Seat, number>;
  /** Up to two face-up card ids waiting to resolve. */
  flipped: number[];
  /** Lock input briefly after a mismatch so both can see the cards. */
  lockUntil: number | null;
};

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function freshMemory(): MemoryState {
  const deck = shuffle(
    MEMORY_EMOJIS.flatMap((emoji) => [
      { emoji },
      { emoji },
    ]),
  ).map((c, id) => ({ id, emoji: c.emoji, matchedBy: null as Seat | null }));

  return {
    seats: emptySeats(),
    turn: "a",
    status: "waiting",
    winner: null,
    version: 0,
    cards: deck,
    scores: { a: 0, b: 0 },
    flipped: [],
    lockUntil: null,
  };
}

export function parseMemory(raw: unknown): MemoryState {
  const s = (raw ?? {}) as Partial<MemoryState>;
  const hasCards = Array.isArray(s.cards) && s.cards.length === MEMORY_EMOJIS.length * 2;
  const cards = hasCards
    ? s.cards!.map((c, i) => ({
        id: typeof c?.id === "number" ? c.id : i,
        emoji: typeof c?.emoji === "string" ? c.emoji : MEMORY_EMOJIS[0],
        matchedBy: c?.matchedBy === "a" || c?.matchedBy === "b" ? c.matchedBy : null,
      }))
    : [];

  return {
    seats: s.seats ?? emptySeats(),
    turn: s.turn === "b" ? "b" : "a",
    status: s.status === "playing" || s.status === "finished" ? s.status : "waiting",
    winner: s.winner === "a" || s.winner === "b" || s.winner === "draw" ? s.winner : null,
    version: typeof s.version === "number" ? s.version : 0,
    scored: Boolean(s.scored),
    cards,
    scores: {
      a: typeof s.scores?.a === "number" ? s.scores.a : 0,
      b: typeof s.scores?.b === "number" ? s.scores.b : 0,
    },
    flipped: Array.isArray(s.flipped) ? s.flipped.filter((n): n is number => typeof n === "number").slice(0, 2) : [],
    lockUntil: typeof s.lockUntil === "number" ? s.lockUntil : null,
  };
}

export function flipMemory(state: MemoryState, cardId: number, by: Seat, now = Date.now()): MemoryState | null {
  if (state.status !== "playing" || state.turn !== by) return null;
  if (state.lockUntil && now < state.lockUntil) return null;
  if (state.flipped.includes(cardId)) return null;

  const card = state.cards.find((c) => c.id === cardId);
  if (!card || card.matchedBy) return null;

  // Clear a resolved mismatch before the next flip.
  let flipped = state.lockUntil && now >= state.lockUntil ? [] : state.flipped.slice();
  let cards = state.cards;
  let lockUntil: number | null = state.lockUntil && now >= state.lockUntil ? null : state.lockUntil;

  if (flipped.length >= 2) return null;

  flipped = [...flipped, cardId];

  if (flipped.length < 2) {
    return { ...state, flipped, lockUntil, version: state.version + 1 };
  }

  const [id1, id2] = flipped;
  const c1 = cards.find((c) => c.id === id1)!;
  const c2 = cards.find((c) => c.id === id2)!;

  if (c1.emoji === c2.emoji) {
    cards = cards.map((c) => (c.id === id1 || c.id === id2 ? { ...c, matchedBy: by } : c));
    const scores = { ...state.scores, [by]: state.scores[by] + 1 };
    const done = cards.every((c) => c.matchedBy);
    let winner: MemoryState["winner"] = null;
    if (done) {
      if (scores.a > scores.b) winner = "a";
      else if (scores.b > scores.a) winner = "b";
      else winner = "draw";
    }
    return {
      ...state,
      cards,
      scores,
      flipped: [],
      lockUntil: null,
      version: state.version + 1,
      // Matcher goes again.
      turn: by,
      status: done ? "finished" : "playing",
      winner,
    };
  }

  // Mismatch: show both briefly, then other player's turn.
  return {
    ...state,
    flipped,
    lockUntil: now + 900,
    version: state.version + 1,
    turn: by === "a" ? "b" : "a",
  };
}

/** Call when lock expires to hide mismatched cards. */
export function clearMemoryLock(state: MemoryState, now = Date.now()): MemoryState | null {
  if (!state.lockUntil || now < state.lockUntil) return null;
  if (state.flipped.length === 0) return { ...state, lockUntil: null };
  return { ...state, flipped: [], lockUntil: null, version: state.version + 1 };
}
