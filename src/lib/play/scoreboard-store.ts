"use client";

import { createClient } from "@/lib/supabase/client";
import {
  applyMatchResult,
  emptyScoreboard,
  parseScoreboard,
  SCOREBOARD_STORAGE_KEY,
  type ScoreboardState,
} from "./scores";
import type { GameId, Seat } from "./types";

function readLocal(): ScoreboardState {
  if (typeof window === "undefined") return emptyScoreboard();
  try {
    const raw = window.localStorage.getItem(SCOREBOARD_STORAGE_KEY);
    return raw ? parseScoreboard(JSON.parse(raw)) : emptyScoreboard();
  } catch {
    return emptyScoreboard();
  }
}

function writeLocal(board: ScoreboardState) {
  try {
    window.localStorage.setItem(SCOREBOARD_STORAGE_KEY, JSON.stringify(board));
  } catch {
    /* ignore */
  }
}

async function readRemote(): Promise<ScoreboardState | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from("game_sessions").select("state").eq("id", "scoreboard").maybeSingle();
  if (error || !data) return null;
  return parseScoreboard(data.state);
}

async function writeRemote(board: ScoreboardState): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from("game_sessions")
    .update({
      state: board as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    })
    .eq("id", "scoreboard");
  return !error;
}

/** Record one finished match. Prefer shared DB; always mirror to localStorage. */
export async function recordMatchResult(
  gameId: GameId,
  aId: string,
  bId: string,
  winner: Seat | "draw",
): Promise<ScoreboardState> {
  const remote = await readRemote();
  const base = remote ?? readLocal();
  const next = applyMatchResult(base, gameId, aId, bId, winner);
  writeLocal(next);
  if (remote) await writeRemote(next);
  else {
    // Try once in case the row exists but read raced.
    await writeRemote(next);
  }
  return next;
}

export async function resetScoreboard(): Promise<ScoreboardState> {
  const next = emptyScoreboard();
  next.updated_at = new Date().toISOString();
  writeLocal(next);
  await writeRemote(next);
  return next;
}

export async function loadScoreboard(): Promise<{ board: ScoreboardState; remote: boolean }> {
  const remote = await readRemote();
  if (remote) {
    writeLocal(remote);
    return { board: remote, remote: true };
  }
  return { board: readLocal(), remote: false };
}
