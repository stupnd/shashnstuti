"use client";

import { useCallback } from "react";
import { NewGameButton, PlayShell, SeatBanner } from "@/components/play/shell";
import { DOTS_N, freshDots, parseDots, playDots, type DotLine } from "@/lib/play/dots";
import { useRecordOnFinish } from "@/lib/play/record-finish";
import type { PlayerInfo } from "@/lib/play/types";
import { useGameSession } from "@/lib/play/use-game-session";

export function DotsGame({ me, partner }: { me: PlayerInfo; partner: PlayerInfo }) {
  const { state, setState, reset, ready, error, mySeat } = useGameSession({
    gameId: "dots",
    meId: me.id,
    partnerId: partner.id,
    fresh: freshDots,
    parse: parseDots,
  });
  const commit = useRecordOnFinish("dots");
  const myTurn = state.status === "playing" && mySeat !== null && state.turn === mySeat;

  const onLine = useCallback(
    async (line: DotLine) => {
      if (!myTurn || !mySeat) return;
      const next = playDots(state, line, mySeat);
      if (next) await commit(next, setState);
    },
    [commit, mySeat, myTurn, setState, state],
  );

  if (!ready) return <p className="label mt-10 text-center">loading board…</p>;

  return (
    <PlayShell
      title="dots & boxes"
      color="var(--mint)"
      footer={
        <>
          <NewGameButton onClick={() => void reset()} />
          {error && <p className="w-full text-center text-xs text-accent">{error}</p>}
        </>
      }
    >
      <SeatBanner
        state={state}
        me={me}
        partner={partner}
        mySeat={mySeat}
        markA={`${state.scores.a}`}
        markB={`${state.scores.b}`}
      />

      <div className="mx-auto w-full max-w-sm select-none px-1">
        {Array.from({ length: DOTS_N }, (_, r) => (
          <div key={`row-${r}`}>
            {/* horizontal lines row + dots */}
            <div className="flex items-center">
              {Array.from({ length: DOTS_N }, (_, c) => (
                <div key={`h-${r}-${c}`} className="flex flex-1 items-center">
                  <Dot />
                  <LineButton
                    horizontal
                    filled={state.h[r][c]}
                    disabled={!myTurn || state.h[r][c]}
                    onClick={() => void onLine({ kind: "h", r, c })}
                  />
                </div>
              ))}
              <Dot />
            </div>
            {/* vertical lines + boxes */}
            <div className="flex">
              {Array.from({ length: DOTS_N }, (_, c) => (
                <div key={`boxrow-${r}-${c}`} className="flex flex-1">
                  <LineButton
                    horizontal={false}
                    filled={state.v[r][c]}
                    disabled={!myTurn || state.v[r][c]}
                    onClick={() => void onLine({ kind: "v", r, c })}
                  />
                  <BoxCell owner={state.boxes[r][c]} seats={state.seats} me={me} partner={partner} />
                </div>
              ))}
              <LineButton
                horizontal={false}
                filled={state.v[r][DOTS_N]}
                disabled={!myTurn || state.v[r][DOTS_N]}
                onClick={() => void onLine({ kind: "v", r, c: DOTS_N })}
              />
            </div>
          </div>
        ))}
        {/* bottom horizontal row */}
        <div className="flex items-center">
          {Array.from({ length: DOTS_N }, (_, c) => (
            <div key={`hb-${c}`} className="flex flex-1 items-center">
              <Dot />
              <LineButton
                horizontal
                filled={state.h[DOTS_N][c]}
                disabled={!myTurn || state.h[DOTS_N][c]}
                onClick={() => void onLine({ kind: "h", r: DOTS_N, c })}
              />
            </div>
          ))}
          <Dot />
        </div>
      </div>

      <p className="mt-4 text-center text-sm text-muted">close a box → go again</p>
    </PlayShell>
  );
}

function Dot() {
  return <span className="relative z-10 h-3 w-3 shrink-0 rounded-full bg-ink" />;
}

function LineButton({
  horizontal,
  filled,
  disabled,
  onClick,
}: {
  horizontal: boolean;
  filled: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={
        horizontal
          ? "h-8 flex-1 rounded-full transition-colors"
          : "w-8 self-stretch rounded-full transition-colors"
      }
      style={{
        background: filled ? "var(--ink)" : "color-mix(in oklab, var(--line) 70%, transparent)",
        minHeight: horizontal ? undefined : "3.25rem",
      }}
      aria-label={horizontal ? "horizontal line" : "vertical line"}
    />
  );
}

function BoxCell({
  owner,
  seats,
  me,
  partner,
}: {
  owner: "a" | "b" | null;
  seats: Partial<Record<"a" | "b", string>>;
  me: PlayerInfo;
  partner: PlayerInfo;
}) {
  const mine = owner && seats[owner] === me.id;
  const color = !owner ? "transparent" : mine ? "var(--pink)" : "var(--sky)";
  return (
    <div
      className="flex flex-1 items-center justify-center rounded-lg text-xs font-bold"
      style={{ background: color, minHeight: "3.25rem" }}
    >
      {owner ? (mine ? me.name.slice(0, 1) : partner.name.slice(0, 1)) : null}
    </div>
  );
}
