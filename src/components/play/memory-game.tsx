"use client";

import { useCallback, useEffect } from "react";
import { NewGameButton, PlayShell, SeatBanner } from "@/components/play/shell";
import { clearMemoryLock, flipMemory, freshMemory, parseMemory } from "@/lib/play/memory";
import type { PlayMode, PlayerInfo, Seat } from "@/lib/play/types";
import { useGameSession } from "@/lib/play/use-game-session";

export function MemoryGame({
  mode,
  me,
  partner,
}: {
  mode: PlayMode;
  me: PlayerInfo;
  partner: PlayerInfo | null;
}) {
  const { state, setState, reset, ready, error, mySeat } = useGameSession({
    gameId: "memory",
    mode,
    meId: me.id,
    partnerId: partner?.id,
    fresh: freshMemory,
    parse: parseMemory,
    needsSeed: (s) => s.cards.length === 0,
  });

  // Clear mismatch lock when timer expires.
  useEffect(() => {
    if (!state.lockUntil) return;
    const ms = Math.max(0, state.lockUntil - Date.now());
    const t = window.setTimeout(() => {
      const next = clearMemoryLock(state);
      if (next) void setState(next);
    }, ms + 20);
    return () => window.clearTimeout(t);
  }, [setState, state]);

  const canPlay = (seat: Seat) => {
    if (state.status !== "playing") return false;
    if (state.lockUntil && Date.now() < state.lockUntil) return false;
    if (mode === "pass") return state.turn === seat;
    return mySeat === seat && state.turn === seat;
  };

  const onFlip = useCallback(
    async (cardId: number) => {
      const by: Seat = mode === "pass" ? state.turn : (mySeat as Seat);
      if (!canPlay(by)) return;
      const next = flipMemory(state, cardId, by);
      if (next) await setState(next);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, mySeat, setState, state],
  );

  if (!ready) return <p className="label mt-10 text-center">shuffling…</p>;
  if (mode === "online" && state.cards.length === 0) {
    return (
      <PlayShell title="memory" color="var(--mint)" mode={mode}>
        <p className="card mt-6 p-5 text-center text-sm" style={{ ["--card-shadow" as string]: "var(--mint)" }}>
          dealing cards… open this on both phones.
        </p>
      </PlayShell>
    );
  }

  const activeSeat = mode === "pass" ? state.turn : mySeat;
  const enabled = activeSeat ? canPlay(activeSeat) : false;

  return (
    <PlayShell
      title="memory"
      color="var(--mint)"
      mode={mode}
      footer={
        <>
          {(state.status === "finished" || mode === "online") && <NewGameButton onClick={() => void reset()} />}
          {error && <p className="w-full text-center text-xs text-accent">{error}</p>}
        </>
      }
    >
      <SeatBanner state={state} mode={mode} me={me} partner={partner} mySeat={mySeat} markA={`${state.scores.a}`} markB={`${state.scores.b}`} />

      <div className="mx-auto grid max-w-sm grid-cols-4 gap-2">
        {state.cards.map((card) => {
          const faceUp = Boolean(card.matchedBy) || state.flipped.includes(card.id);
          const matched = Boolean(card.matchedBy);
          return (
            <button
              key={card.id}
              type="button"
              disabled={!enabled || faceUp}
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

      {mode === "pass" && state.status === "playing" && (
        <p className="mt-5 text-center text-sm text-muted">find a match · pass the phone</p>
      )}
    </PlayShell>
  );
}
