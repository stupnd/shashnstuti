"use client";

import { Avatar } from "@/components/ui";
import { GAMES, type PlayerInfo } from "@/lib/play/types";
import { EMPTY_TALLIES, type ScoreboardState } from "@/lib/play/scores";
import { useScoreboard } from "@/lib/play/use-scoreboard";

export function Scoreboard({
  me,
  partner,
}: {
  me: PlayerInfo;
  partner: PlayerInfo | null;
}) {
  const { board, ready, resetAll } = useScoreboard();

  if (!ready) {
    return <p className="label mt-6 text-center">loading scores…</p>;
  }

  const players = [
    me,
    partner ?? { id: "player-2", name: "player 2", avatar: "🤍" },
  ];

  const totals = players.map((p) => ({
    ...p,
    tallies: board.players[p.id]?.total ?? EMPTY_TALLIES,
  }));
  const leader =
    totals[0].tallies.wins === totals[1].tallies.wins
      ? null
      : totals[0].tallies.wins > totals[1].tallies.wins
        ? totals[0]
        : totals[1];

  const hasAny = Object.values(board.players).some(
    (p) => p.total.wins + p.total.losses + p.total.draws > 0,
  );

  return (
    <section className="card mt-8 p-5" style={{ ["--card-shadow" as string]: "var(--peach)" }}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-semibold tracking-tight text-2xl"><span className="ul">scoreboard</span></h2>
        {hasAny && (
          <button type="button" className="label hover:text-ink" onClick={() => void resetAll()}>
            reset
          </button>
        )}
      </div>

      {!hasAny ? (
        <p className="mt-3 text-sm text-muted">no games yet — wins show up here.</p>
      ) : (
        <>
          <div className="mt-4 flex items-stretch justify-center gap-3">
            {totals.map((p, i) => (
              <div
                key={p.id}
                className={`flex flex-1 flex-col items-center rounded-2xl border-[1.5px] border-line px-3 py-4 ${
                  leader?.id === p.id ? "bg-butter" : "bg-surface"
                }`}
              >
                <Avatar value={p.avatar} size={28} />
                <p className="mt-2 max-w-full truncate text-sm font-semibold">{p.name}</p>
                <p className="font-semibold tracking-tight mt-1 text-4xl leading-none">{p.tallies.wins}</p>
                <p className="label mt-1">wins</p>
                <p className="mt-2 text-[11px] text-muted">
                  {p.tallies.losses}L · {p.tallies.draws}D
                </p>
                {i === 0 && <span className="sr-only">versus</span>}
              </div>
            ))}
          </div>

          {leader && (
            <p className="font-hand mt-3 text-center text-xl text-ink">
              {leader.name} is ahead
            </p>
          )}
          {!leader && hasAny && (
            <p className="font-hand mt-3 text-center text-xl text-ink">tied!</p>
          )}

          <ul className="mt-5 space-y-2 border-t-2 border-dashed border-line pt-4">
            {GAMES.map((g) => (
              <li key={g.id} className="flex items-center gap-2 text-sm">
                <span className="w-24 shrink-0 font-semibold" style={{ color: "var(--ink)" }}>
                  {g.title}
                </span>
                <GameRow board={board} gameId={g.id} players={players} />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function GameRow({
  board,
  gameId,
  players,
}: {
  board: ScoreboardState;
  gameId: (typeof GAMES)[number]["id"];
  players: PlayerInfo[];
}) {
  const [a, b] = players;
  const aW = board.players[a.id]?.byGame[gameId]?.wins ?? 0;
  const bW = board.players[b.id]?.byGame[gameId]?.wins ?? 0;
  return (
    <span className="flex flex-1 items-center justify-between gap-2 font-medium text-muted">
      <span>
        {a.name.split(" ")[0]} {aW}
      </span>
      <span className="text-xs">–</span>
      <span>
        {bW} {b.name.split(" ")[0]}
      </span>
    </span>
  );
}
