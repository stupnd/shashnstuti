"use client";

import { useCallback } from "react";
import { NewGameButton, PlayShell, SeatBanner } from "@/components/play/shell";
import { useRecordOnFinish } from "@/lib/play/record-finish";
import { playTtt, parseTtt, freshTtt } from "@/lib/play/ttt";
import type { PlayerInfo } from "@/lib/play/types";
import { useGameSession } from "@/lib/play/use-game-session";

export function TicTacToe({ me, partner }: { me: PlayerInfo; partner: PlayerInfo }) {
  const { state, setState, reset, ready, error, mySeat } = useGameSession({
    gameId: "ttt",
    meId: me.id,
    partnerId: partner.id,
    fresh: freshTtt,
    parse: parseTtt,
  });
  const commit = useRecordOnFinish("ttt");

  const myTurn = state.status === "playing" && mySeat !== null && state.turn === mySeat;

  const onCell = useCallback(
    async (i: number) => {
      if (!myTurn || !mySeat) return;
      const next = playTtt(state, i, mySeat);
      if (next) await commit(next, setState);
    },
    [commit, mySeat, myTurn, setState, state],
  );

  if (!ready) return <p className="label mt-10 text-center">loading board…</p>;

  return (
    <PlayShell
      title="tic-tac-toe"
      color="var(--butter)"
      footer={
        <>
          <NewGameButton onClick={() => void reset()} />
          {error && <p className="w-full text-center text-xs text-accent">{error}</p>}
        </>
      }
    >
      <SeatBanner state={state} me={me} partner={partner} mySeat={mySeat} markA="X" markB="O" />

      <div className="mx-auto grid max-w-xs grid-cols-3 gap-2">
        {state.board.map((cell, i) => (
          <button
            key={i}
            type="button"
            disabled={!myTurn || Boolean(cell)}
            onClick={() => void onCell(i)}
            className="card aspect-square flex items-center justify-center text-4xl font-marker transition-transform hover:-translate-y-0.5 disabled:opacity-100"
            style={{ ["--card-shadow" as string]: cell === "a" ? "var(--pink)" : cell === "b" ? "var(--sky)" : "var(--line)" }}
            aria-label={cell ? (cell === "a" ? "X" : "O") : `cell ${i + 1}`}
          >
            {cell === "a" ? "X" : cell === "b" ? "O" : ""}
          </button>
        ))}
      </div>
    </PlayShell>
  );
}
