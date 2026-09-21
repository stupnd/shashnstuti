"use client";

import { useCallback } from "react";
import { NewGameButton, PlayShell, SeatBanner } from "@/components/play/shell";
import { C4_COLS, C4_ROWS, freshConnect4, parseConnect4, playConnect4 } from "@/lib/play/connect4";
import type { PlayMode, PlayerInfo, Seat } from "@/lib/play/types";
import { useGameSession } from "@/lib/play/use-game-session";

export function ConnectFour({
  mode,
  me,
  partner,
}: {
  mode: PlayMode;
  me: PlayerInfo;
  partner: PlayerInfo | null;
}) {
  const { state, setState, reset, ready, error, mySeat } = useGameSession({
    gameId: "connect4",
    mode,
    meId: me.id,
    partnerId: partner?.id,
    fresh: freshConnect4,
    parse: parseConnect4,
    needsSeed: () => false,
  });

  const canPlay = (seat: Seat) => {
    if (state.status !== "playing") return false;
    if (mode === "pass") return state.turn === seat;
    return mySeat === seat && state.turn === seat;
  };

  const onCol = useCallback(
    async (col: number) => {
      const by: Seat = mode === "pass" ? state.turn : (mySeat as Seat);
      if (!canPlay(by)) return;
      const next = playConnect4(state, col, by);
      if (next) await setState(next);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, mySeat, setState, state],
  );

  if (!ready) return <p className="label mt-10 text-center">loading board…</p>;

  const activeSeat = mode === "pass" ? state.turn : mySeat;
  const enabled = activeSeat ? canPlay(activeSeat) : false;

  return (
    <PlayShell
      title="connect four"
      color="var(--sky)"
      mode={mode}
      footer={
        <>
          {(state.status === "finished" || mode === "online") && <NewGameButton onClick={() => void reset()} />}
          {error && <p className="w-full text-center text-xs text-accent">{error}</p>}
        </>
      }
    >
      <SeatBanner state={state} mode={mode} me={me} partner={partner} mySeat={mySeat} markA="●" markB="●" />

      <div className="mx-auto w-full max-w-sm overflow-hidden rounded-[1.5rem] border-[3px] border-ink bg-sky/40 p-2 dark:bg-sky/20">
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: C4_COLS }, (_, col) => (
            <button
              key={col}
              type="button"
              disabled={!enabled || state.board[col].every(Boolean)}
              onClick={() => void onCol(col)}
              className="flex flex-col-reverse gap-1.5 rounded-xl p-0.5 transition-transform hover:-translate-y-0.5 disabled:opacity-100"
              aria-label={`column ${col + 1}`}
            >
              {Array.from({ length: C4_ROWS }, (_, row) => {
                const cell = state.board[col][row];
                return (
                  <span
                    key={row}
                    className="aspect-square w-full rounded-full border-2 border-ink/20 bg-surface"
                    style={{
                      background: cell === "a" ? "var(--accent)" : cell === "b" ? "var(--butter)" : "var(--surface)",
                      borderColor: cell ? "var(--ink)" : undefined,
                    }}
                  />
                );
              })}
            </button>
          ))}
        </div>
      </div>

      {mode === "pass" && state.status === "playing" && (
        <p className="mt-5 text-center text-sm text-muted">tap a column to drop · pass the phone</p>
      )}
    </PlayShell>
  );
}
