import type { GameId, Seat } from "./types";
import { GAMES } from "./types";

export type Tallies = { wins: number; losses: number; draws: number };

export type PlayerTallies = {
  total: Tallies;
  byGame: Partial<Record<GameId, Tallies>>;
};

export type ScoreboardState = {
  players: Record<string, PlayerTallies>;
  updated_at: string | null;
};

export const EMPTY_TALLIES: Tallies = { wins: 0, losses: 0, draws: 0 };

export function emptyScoreboard(): ScoreboardState {
  return { players: {}, updated_at: null };
}

export function emptyPlayer(): PlayerTallies {
  return { total: { ...EMPTY_TALLIES }, byGame: {} };
}

export function parseScoreboard(raw: unknown): ScoreboardState {
  const s = (raw ?? {}) as Partial<ScoreboardState>;
  const players: ScoreboardState["players"] = {};
  if (s.players && typeof s.players === "object") {
    for (const [id, p] of Object.entries(s.players)) {
      players[id] = {
        total: {
          wins: Number(p?.total?.wins) || 0,
          losses: Number(p?.total?.losses) || 0,
          draws: Number(p?.total?.draws) || 0,
        },
        byGame: {},
      };
      if (p?.byGame && typeof p.byGame === "object") {
        for (const g of GAMES) {
          const t = p.byGame[g.id];
          if (!t) continue;
          players[id].byGame[g.id] = {
            wins: Number(t.wins) || 0,
            losses: Number(t.losses) || 0,
            draws: Number(t.draws) || 0,
          };
        }
      }
    }
  }
  return {
    players,
    updated_at: typeof s.updated_at === "string" ? s.updated_at : null,
  };
}

function bump(t: Tallies, field: keyof Tallies): Tallies {
  return { ...t, [field]: t[field] + 1 };
}

function ensurePlayer(board: ScoreboardState, id: string): PlayerTallies {
  if (!board.players[id]) board.players[id] = emptyPlayer();
  return board.players[id];
}

function addResult(board: ScoreboardState, playerId: string, gameId: GameId, field: keyof Tallies) {
  const p = ensurePlayer(board, playerId);
  p.total = bump(p.total, field);
  p.byGame[gameId] = bump(p.byGame[gameId] ?? { ...EMPTY_TALLIES }, field);
}

/**
 * Apply one finished match to the scoreboard.
 * `aId` / `bId` are the two players' profile ids.
 */
export function applyMatchResult(
  board: ScoreboardState,
  gameId: GameId,
  aId: string,
  bId: string,
  winner: Seat | "draw",
): ScoreboardState {
  const next: ScoreboardState = {
    players: { ...board.players },
    updated_at: new Date().toISOString(),
  };
  // Deep-ish copy players we touch
  next.players[aId] = {
    total: { ...(board.players[aId]?.total ?? EMPTY_TALLIES) },
    byGame: { ...(board.players[aId]?.byGame ?? {}) },
  };
  next.players[bId] = {
    total: { ...(board.players[bId]?.total ?? EMPTY_TALLIES) },
    byGame: { ...(board.players[bId]?.byGame ?? {}) },
  };

  if (winner === "draw") {
    addResult(next, aId, gameId, "draws");
    addResult(next, bId, gameId, "draws");
  } else if (winner === "a") {
    addResult(next, aId, gameId, "wins");
    addResult(next, bId, gameId, "losses");
  } else {
    addResult(next, bId, gameId, "wins");
    addResult(next, aId, gameId, "losses");
  }
  return next;
}

export const SCOREBOARD_STORAGE_KEY = "scrapbook-game-scores";
