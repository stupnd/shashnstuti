"use client";

import { useCallback } from "react";
import { NewGameButton, PlayShell, SeatBanner } from "@/components/play/shell";
import { C4_COLS, C4_ROWS, freshConnect4, parseConnect4, playConnect4 } from "@/lib/play/connect4";
import { useRecordOnFinish } from "@/lib/play/record-finish";
import type { PlayerInfo } from "@/lib/play/types";
import { useGameSession } from "@/lib/play/use-game-session";

export function ConnectFour({ me, partner }: { me: PlayerInfo; partner: PlayerInfo }) {
  const { state, setState, reset, ready, error, mySeat } = useGameSession({
    gameId: "connect4",
    meId: me.id,
    partnerId: partner.id,
    fresh: freshConnect4,
    parse: parseConnect4,
  });
  const commit = useRecordOnFinish("connect4");

  const myTurn = state.status === "playing" && mySeat !== null && state.turn === mySeat;

  const onCol = useCallback(
    async (col: number) => {
      if (!myTurn || !mySeat) return;
      const next = playConnect4(state, col, mySeat);
      if (next) await commit(next, setState);
    },
    [commit, mySeat, myTurn, setState, state],
  );

  if (!ready) return <p className="label mt-10 text-center">loading board…</p>;

  return (
    <PlayShell
      title="connect four"
      color="var(--sky)"
      footer={
        <>
          <NewGameButton onClick={() => void reset()} />
          {error && <p className="w-full text-center text-xs text-accent">{error}</p>}
        </>
      }
    >
      <SeatBanner state={state} me={me} partner={partner} mySeat={mySeat} markA="●" markB="●" />

      <div className="mx-auto w-full max-w-sm overflow-hidden rounded-[1.5rem] border-[3px] border-ink bg-sky/40 p-2 dark:bg-sky/20">
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: C4_COLS }, (_, col) => (
            <button
              key={col}
              type="button"
              disabled={!myTurn || state.board[col].every(Boolean)}
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
    </PlayShell>
  );
}
