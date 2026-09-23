"use client";

import { useCallback } from "react";
import { NewGameButton, PlayShell, SeatBanner } from "@/components/play/shell";
import { createClient } from "@/lib/supabase/client";
import { useRecordOnFinish } from "@/lib/play/record-finish";
import {
  CHOICES,
  SHOWDOWN_TARGET,
  freshShowdown,
  parseShowdown,
  pickShowdown,
  type Choice,
} from "@/lib/play/showdown";
import type { PlayerInfo } from "@/lib/play/types";
import { useGameSession } from "@/lib/play/use-game-session";

const EMOJI: Record<Choice, string> = {
  rock: "🪨",
  paper: "📄",
  scissors: "✂️",
};

export function ShowdownGame({ me, partner }: { me: PlayerInfo; partner: PlayerInfo }) {
  const { state, setState, reset, ready, error, mySeat } = useGameSession({
    gameId: "showdown",
    meId: me.id,
    partnerId: partner.id,
    fresh: freshShowdown,
    parse: parseShowdown,
  });
  const commit = useRecordOnFinish("showdown");

  const myPick = mySeat ? state.picks[mySeat] : undefined;
  const theirSeat = mySeat === "a" ? "b" : mySeat === "b" ? "a" : null;
  const theirPick = theirSeat ? state.picks[theirSeat] : undefined;
  const canPick = state.status === "playing" && mySeat && !myPick;

  const onPick = useCallback(
    async (choice: Choice) => {
      if (!canPick || !mySeat) return;

      // Re-read so simultaneous picks don't overwrite each other.
      const supabase = createClient();
      const { data } = await supabase.from("game_sessions").select("state").eq("id", "showdown").maybeSingle();
      const remote = parseShowdown(data?.state ?? {});
      const base = remote.version >= state.version ? remote : state;
      const merged = {
        ...base,
        seats: state.seats,
        status: state.status === "finished" ? ("finished" as const) : ("playing" as const),
        scored: state.scored,
      };
      const next = pickShowdown(merged, mySeat, choice);
      if (next) await commit(next, setState);
    },
    [canPick, commit, mySeat, setState, state],
  );

  if (!ready) return <p className="label mt-10 text-center">loading…</p>;

  return (
    <PlayShell
      title="showdown"
      color="var(--peach)"
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
        statusText={
          state.status === "finished"
            ? undefined
            : myPick && theirPick
              ? "reveal!"
              : myPick
                ? "locked in"
                : "pick one"
        }
      />

      <p className="mb-4 text-center text-sm text-muted">first to {SHOWDOWN_TARGET} wins</p>

      {state.last && state.status === "playing" && (
        <p className="card mb-4 p-3 text-center text-sm" style={{ ["--card-shadow" as string]: "var(--butter)" }}>
          {EMOJI[state.last.a]} vs {EMOJI[state.last.b]} —{" "}
          {state.last.winner === "draw"
            ? "tie"
            : state.seats[state.last.winner] === me.id
              ? "you take the point"
              : `${partner.name} takes the point`}
        </p>
      )}

      <div className="mb-6 flex items-center justify-center gap-6">
        <PickStatus
          label="you"
          ready={Boolean(myPick)}
          reveal={state.last ? (mySeat === "a" ? state.last.a : state.last.b) : myPick}
          waiting={!myPick && state.status === "playing"}
        />
        <span className="font-semibold tracking-tight text-2xl">vs</span>
        <PickStatus
          label={partner.name}
          ready={Boolean(theirPick)}
          reveal={state.last ? (theirSeat === "a" ? state.last.a : state.last.b) : theirPick ? "ready" : undefined}
          waiting={!theirPick && state.status === "playing"}
        />
      </div>

      {state.status === "playing" && (
        <div className="mx-auto grid max-w-sm grid-cols-3 gap-3">
          {CHOICES.map((c) => (
            <button
              key={c.id}
              type="button"
              disabled={!canPick}
              onClick={() => void onPick(c.id)}
              className={`card flex flex-col items-center gap-2 py-5 transition-transform hover:-translate-y-1 disabled:opacity-100 ${
                myPick === c.id ? "ring-2 ring-ink" : ""
              }`}
              style={{ ["--card-shadow" as string]: myPick === c.id ? "var(--accent)" : "var(--peach)" }}
            >
              <span className="text-3xl">{EMOJI[c.id]}</span>
              <span className="text-sm font-semibold">{c.label}</span>
            </button>
          ))}
        </div>
      )}

      {canPick && <p className="mt-4 text-center text-sm text-muted">lock in your move</p>}
      {!canPick && state.status === "playing" && myPick && !theirPick && (
        <p className="mt-4 text-center text-sm text-muted">waiting for {partner.name}…</p>
      )}
    </PlayShell>
  );
}

function PickStatus({
  label,
  ready,
  reveal,
  waiting,
}: {
  label: string;
  ready: boolean;
  reveal?: Choice | "ready";
  waiting: boolean;
}) {
  return (
    <div className="flex w-24 flex-col items-center">
      <p className="label mb-2 truncate">{label}</p>
      <div
        className="flex h-16 w-16 items-center justify-center rounded-2xl border-[1.5px] border-line text-2xl"
        style={{ background: ready || reveal ? "var(--butter)" : "var(--surface)" }}
      >
        {reveal && reveal !== "ready" ? EMOJI[reveal] : ready || reveal === "ready" ? "✓" : waiting ? "?" : "—"}
      </div>
    </div>
  );
}
