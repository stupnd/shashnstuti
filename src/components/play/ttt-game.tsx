"use client";

import { useCallback } from "react";
import { NewGameButton, PlayShell, SeatBanner } from "@/components/play/shell";
import { playTtt, parseTtt, freshTtt } from "@/lib/play/ttt";
import type { PlayMode, PlayerInfo, Seat } from "@/lib/play/types";
import { useGameSession } from "@/lib/play/use-game-session";

export function TicTacToe({
  mode,
  me,
  partner,
}: {
  mode: PlayMode;
  me: PlayerInfo;
  partner: PlayerInfo | null;
}) {
  const { state, setState, reset, ready, error, mySeat } = useGameSession({
    gameId: "ttt",
    mode,
    meId: me.id,
    partnerId: partner?.id,
    fresh: freshTtt,
    parse: parseTtt,
    needsSeed: () => false,
  });

  const canPlay = (seat: Seat) => {
    if (state.status !== "playing") return false;
    if (mode === "pass") return state.turn === seat;
    return mySeat === seat && state.turn === seat;
  };

  const onCell = useCallback(
    async (i: number) => {
      const by: Seat = mode === "pass" ? state.turn : (mySeat as Seat);
      if (!canPlay(by)) return;
      const next = playTtt(state, i, by);
      if (next) await setState(next);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, mySeat, setState, state],
  );

  if (!ready) return <p className="label mt-10 text-center">loading board…</p>;

  return (
    <PlayShell
      title="tic-tac-toe"
      color="var(--butter)"
      mode={mode}
      footer={
        <>
          {(state.status === "finished" || mode === "online") && <NewGameButton onClick={() => void reset()} />}
          {error && <p className="w-full text-center text-xs text-accent">{error}</p>}
        </>
      }
    >
      <SeatBanner state={state} mode={mode} me={me} partner={partner} mySeat={mySeat} markA="X" markB="O" />

      <div className="mx-auto grid max-w-xs grid-cols-3 gap-2">
        {state.board.map((cell, i) => {
          const activeSeat = mode === "pass" ? state.turn : mySeat;
          const enabled = activeSeat ? canPlay(activeSeat) && !cell : false;
          return (
            <button
              key={i}
              type="button"
              disabled={!enabled}
              onClick={() => void onCell(i)}
              className="card aspect-square flex items-center justify-center text-4xl font-marker transition-transform hover:-translate-y-0.5 disabled:opacity-100"
              style={{ ["--card-shadow" as string]: cell === "a" ? "var(--pink)" : cell === "b" ? "var(--sky)" : "var(--line)" }}
              aria-label={cell ? (cell === "a" ? "X" : "O") : `cell ${i + 1}`}
            >
              {cell === "a" ? "X" : cell === "b" ? "O" : ""}
            </button>
          );
        })}
      </div>

      {mode === "pass" && state.status === "playing" && (
        <p className="mt-5 text-center text-sm text-muted">pass the phone when it’s their turn</p>
      )}
    </PlayShell>
  );
}
