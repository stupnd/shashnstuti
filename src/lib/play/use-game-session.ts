"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BaseState, GameId, Seat } from "./types";
import { seatOf } from "./types";

type Options<S extends BaseState> = {
  gameId: GameId;
  meId: string;
  partnerId: string;
  fresh: () => S;
  parse: (raw: unknown) => S;
  /** True when the parsed row still needs a host to seed a board. */
  needsSeed?: (state: S) => boolean;
};

function coupleSeats(meId: string, partnerId: string): BaseState["seats"] {
  const [a, b] = meId < partnerId ? [meId, partnerId] : [partnerId, meId];
  return { a, b };
}

/**
 * Synced board via `game_sessions` + Supabase Realtime.
 * Seats are fixed by profile id so both phones agree without a lobby.
 */
export function useGameSession<S extends BaseState>({
  gameId,
  meId,
  partnerId,
  fresh,
  parse,
  needsSeed = () => false,
}: Options<S>) {
  const [state, setState] = useState<S>(() => fresh());
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const writing = useRef(false);
  const localVersion = useRef(0);

  const applyLocal = useCallback((next: S) => {
    localVersion.current = next.version;
    setState(next);
  }, []);

  const persist = useCallback(
    async (next: S | BaseState) => {
      writing.current = true;
      applyLocal(next as S);
      const supabase = createClient();
      const { error: err } = await supabase
        .from("game_sessions")
        .update({
          state: next as unknown as Record<string, unknown>,
          updated_at: new Date().toISOString(),
          updated_by: meId,
        })
        .eq("id", gameId);
      writing.current = false;
      if (err) setError(err.message);
    },
    [applyLocal, gameId, meId],
  );

  const reset = useCallback(async () => {
    const next = fresh();
    next.seats = coupleSeats(meId, partnerId);
    next.status = "playing";
    await persist(next);
  }, [fresh, meId, partnerId, persist]);

  // Bootstrap
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const supabase = createClient();
      const seats = coupleSeats(meId, partnerId);
      const iAmHost = meId === seats.a;
      const { data, error: err } = await supabase.from("game_sessions").select("state").eq("id", gameId).maybeSingle();
      if (cancelled) return;
      if (err) {
        setError(err.message);
        setReady(true);
        return;
      }

      const stored = parse(data?.state ?? {});
      let next: S;

      if (needsSeed(stored)) {
        if (iAmHost) {
          next = { ...fresh(), seats, status: "playing", version: 0 };
          await supabase
            .from("game_sessions")
            .update({
              state: next as unknown as Record<string, unknown>,
              updated_at: new Date().toISOString(),
              updated_by: meId,
            })
            .eq("id", gameId);
        } else {
          next = { ...stored, seats, status: "waiting" };
        }
      } else {
        next = {
          ...stored,
          seats,
          status: stored.status === "finished" ? "finished" : "playing",
        };
      }

      if (cancelled) return;
      localVersion.current = next.version;
      setState(next);
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bootstrap once per game
  }, [gameId, meId, partnerId]);

  // Realtime
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`game:${gameId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "game_sessions", filter: `id=eq.${gameId}` },
        (payload) => {
          if (writing.current) return;
          const row = payload.new as { state?: unknown };
          const next = parse(row.state);
          if (next.version < localVersion.current) return;
          localVersion.current = next.version;
          setState(next);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [gameId, parse]);

  const mySeat: Seat | null = seatOf(state.seats, meId);

  return { state, setState: persist, reset, ready, error, mySeat };
}
