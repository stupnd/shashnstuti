"use client";

import { useCallback, useEffect } from "react";
import { NewGameButton, PlayShell, SeatBanner } from "@/components/play/shell";
import { clearMemoryLock, flipMemory, freshMemory, parseMemory } from "@/lib/play/memory";
import { useRecordOnFinish } from "@/lib/play/record-finish";
import type { PlayerInfo } from "@/lib/play/types";
import { useGameSession } from "@/lib/play/use-game-session";

export function MemoryGame({ me, partner }: { me: PlayerInfo; partner: PlayerInfo }) {
  const { state, setState, reset, ready, error, mySeat } = useGameSession({
    gameId: "memory",
    meId: me.id,
    partnerId: partner.id,
    fresh: freshMemory,
    parse: parseMemory,
    needsSeed: (s) => s.cards.length === 0,
  });
  const commit = useRecordOnFinish("memory");

  useEffect(() => {
    if (!state.lockUntil) return;
    const ms = Math.max(0, state.lockUntil - Date.now());
    const t = window.setTimeout(() => {
      const next = clearMemoryLock(state);
      if (next) void setState(next);
    }, ms + 20);
    return () => window.clearTimeout(t);
  }, [setState, state]);

  const locked = Boolean(state.lockUntil && Date.now() < state.lockUntil);
  const myTurn = state.status === "playing" && mySeat !== null && state.turn === mySeat && !locked;

  const onFlip = useCallback(
    async (cardId: number) => {
      if (!myTurn || !mySeat) return;
      const next = flipMemory(state, cardId, mySeat);
      if (next) await commit(next, setState);
    },
    [commit, mySeat, myTurn, setState, state],
  );

  if (!ready) return <p className="label mt-10 text-center">shuffling…</p>;
  if (state.cards.length === 0) {
    return (
      <PlayShell title="memory" color="var(--mint)">
        <p className="card mt-6 p-5 text-center text-sm" style={{ ["--card-shadow" as string]: "var(--mint)" }}>
          dealing cards… open this on both phones.
        </p>
      </PlayShell>
    );
  }

  return (
    <PlayShell
      title="memory"
      color="var(--mint)"
      footer={
        <>
          <NewGameButton onClick={() => void reset()} />
          {error && <p className="w-full text-center text-xs text-accent">{error}</p>}
        </>
      }
    >
      <SeatBanner state={state} me={me} partner={partner} mySeat={mySeat} markA={`${state.scores.a}`} markB={`${state.scores.b}`} />

      <div className="mx-auto grid max-w-sm grid-cols-4 gap-2">
        {state.cards.map((card) => {
          const faceUp = Boolean(card.matchedBy) || state.flipped.includes(card.id);
          const matched = Boolean(card.matchedBy);
          return (
            <button
              key={card.id}
              type="button"
              disabled={!myTurn || faceUp}
              onClick={() => void onFlip(card.id)}
              className="card aspect-square flex items-center justify-center text-2xl transition-transform hover:-translate-y-0.5 disabled:opacity-100"
              style={{
                ["--card-shadow" as string]: matched
                  ? card.matchedBy === "a"
                    ? "var(--pink)"
                    : "var(--sky)"
                  : faceUp
                    ? "var(--butter)"
                    : "var(--lilac)",
                background: faceUp ? "var(--surface)" : "var(--lilac)",
              }}
              aria-label={faceUp ? card.emoji : "hidden card"}
            >
              {faceUp ? card.emoji : "?"}
            </button>
          );
        })}
      </div>
    </PlayShell>
  );
}
