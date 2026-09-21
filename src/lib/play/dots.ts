import type { BaseState, Seat } from "./types";
import { emptySeats } from "./types";

/** 3×3 boxes keeps the board tidy on a phone. */
export const DOTS_N = 3;

export type DotsState = BaseState & {
  /** Horizontal lines: (n+1) rows × n cols */
  h: boolean[][];
  /** Vertical lines: n rows × (n+1) cols */
  v: boolean[][];
  boxes: (Seat | null)[][];
  scores: Record<Seat, number>;
};

function emptyH(): boolean[][] {
  return Array.from({ length: DOTS_N + 1 }, () => Array(DOTS_N).fill(false));
}
function emptyV(): boolean[][] {
  return Array.from({ length: DOTS_N }, () => Array(DOTS_N + 1).fill(false));
}
function emptyBoxes(): (Seat | null)[][] {
  return Array.from({ length: DOTS_N }, () => Array(DOTS_N).fill(null));
}

export function freshDots(): DotsState {
  return {
    seats: emptySeats(),
    turn: "a",
    status: "waiting",
    winner: null,
    version: 0,
    h: emptyH(),
    v: emptyV(),
    boxes: emptyBoxes(),
    scores: { a: 0, b: 0 },
  };
}

function parseGrid<T>(raw: unknown, rows: number, cols: number, fill: T, coerce: (x: unknown) => T): T[][] {
  if (!Array.isArray(raw) || raw.length !== rows) {
    return Array.from({ length: rows }, () => Array(cols).fill(fill));
  }
  return raw.map((row) => {
    if (!Array.isArray(row) || row.length !== cols) return Array(cols).fill(fill);
    return row.map(coerce);
  });
}

export function parseDots(raw: unknown): DotsState {
  const s = (raw ?? {}) as Partial<DotsState>;
  return {
    seats: s.seats ?? emptySeats(),
    turn: s.turn === "b" ? "b" : "a",
    status: s.status === "playing" || s.status === "finished" ? s.status : "waiting",
    winner: s.winner === "a" || s.winner === "b" || s.winner === "draw" ? s.winner : null,
    version: typeof s.version === "number" ? s.version : 0,
    scored: Boolean(s.scored),
    h: parseGrid(s.h, DOTS_N + 1, DOTS_N, false, (x) => Boolean(x)),
    v: parseGrid(s.v, DOTS_N, DOTS_N + 1, false, (x) => Boolean(x)),
    boxes: parseGrid(s.boxes, DOTS_N, DOTS_N, null, (x) => (x === "a" || x === "b" ? x : null)),
    scores: {
      a: typeof s.scores?.a === "number" ? s.scores.a : 0,
      b: typeof s.scores?.b === "number" ? s.scores.b : 0,
    },
  };
}

function boxComplete(h: boolean[][], v: boolean[][], r: number, c: number): boolean {
  return h[r][c] && h[r + 1][c] && v[r][c] && v[r][c + 1];
}

export type DotLine = { kind: "h"; r: number; c: number } | { kind: "v"; r: number; c: number };

export function playDots(state: DotsState, line: DotLine, by: Seat): DotsState | null {
  if (state.status !== "playing" || state.turn !== by) return null;

  const h = state.h.map((row) => row.slice());
  const v = state.v.map((row) => row.slice());
  if (line.kind === "h") {
    if (line.r < 0 || line.r > DOTS_N || line.c < 0 || line.c >= DOTS_N) return null;
    if (h[line.r][line.c]) return null;
    h[line.r][line.c] = true;
  } else {
    if (line.r < 0 || line.r >= DOTS_N || line.c < 0 || line.c > DOTS_N) return null;
    if (v[line.r][line.c]) return null;
    v[line.r][line.c] = true;
  }

  const boxes = state.boxes.map((row) => row.slice());
  let gained = 0;
  for (let r = 0; r < DOTS_N; r++) {
    for (let c = 0; c < DOTS_N; c++) {
      if (!boxes[r][c] && boxComplete(h, v, r, c)) {
        boxes[r][c] = by;
        gained++;
      }
    }
  }

  const scores = { ...state.scores, [by]: state.scores[by] + gained };
  const total = DOTS_N * DOTS_N;
  const claimed = scores.a + scores.b;
  const done = claimed >= total;

  let winner: DotsState["winner"] = null;
  if (done) {
    if (scores.a > scores.b) winner = "a";
    else if (scores.b > scores.a) winner = "b";
    else winner = "draw";
  }

  return {
    ...state,
    h,
    v,
    boxes,
    scores,
    version: state.version + 1,
    // Extra turn if you closed a box.
    turn: gained > 0 ? by : by === "a" ? "b" : "a",
    status: done ? "finished" : "playing",
    winner,
  };
}
