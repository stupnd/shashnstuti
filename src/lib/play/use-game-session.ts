"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { BaseState, GameId, PlayMode, Seat } from "./types";
import { seatOf } from "./types";

type Options<S extends BaseState> = {
  gameId: GameId;
  mode: PlayMode;
  meId: string;
  /** Required for online — the other person's profile id. */
  partnerId?: string | null;
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
 * Pass-and-play keeps state local.
 * Online writes to `game_sessions` and listens via Supabase Realtime.
 * Seats are fixed by profile id so both phones agree without a lobby.
 * The lexicographically-first profile id seeds a fresh board when needed.
 */
export function useGameSession<S extends BaseState>({
  gameId,
  mode,
  meId,
  partnerId,
  fresh,
  parse,
  needsSeed = () => false,
}: Options<S>) {
  const [state, setState] = useState<S>(() => fresh());
  const [ready, setReady] = useState(mode === "pass");
  const [error, setError] = useState<string | null>(null);
  const writing = useRef(false);
  const localVersion = useRef(0);

  const applyLocal = useCallback((next: S) => {
    localVersion.current = next.version;
    setState(next);
  }, []);

  const persist = useCallback(
    async (next: S) => {
      if (mode !== "online") {
        applyLocal(next);
        return;
      }
      writing.current = true;
      applyLocal(next);
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
    [applyLocal, gameId, meId, mode],
  );

  const reset = useCallback(async () => {
    const next = fresh();
    if (mode === "pass") {
      next.seats = { a: "pass-a", b: "pass-b" };
      next.status = "playing";
      applyLocal(next);
      return;
    }
    if (!partnerId) return;
    next.seats = coupleSeats(meId, partnerId);
    next.status = "playing";
    // Mark as seeded so guest doesn’t treat it as empty: bump via playing at v0 is ok;
    // guest needsSeed should check content. Use version 1 after seed write? Keep v0 and
    // rely on needsSeed content checks per game.
    await persist(next);
  }, [applyLocal, fresh, meId, mode, partnerId, persist]);

  // Bootstrap
  useEffect(() => {
    let cancelled = false;

    if (mode === "pass") {
      const next = fresh();
      next.seats = { a: "pass-a", b: "pass-b" };
      next.status = "playing";
      applyLocal(next);
      setReady(true);
      return;
    }

    if (!partnerId) {
      setError("partner hasn’t signed in yet");
      setReady(true);
      return;
    }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bootstrap once per mode/game
  }, [gameId, mode, meId, partnerId]);

  // Realtime
  useEffect(() => {
    if (mode !== "online") return;

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
  }, [gameId, mode, parse]);

  const mySeat: Seat | null = mode === "pass" ? null : seatOf(state.seats, meId);

  return { state, setState: persist, reset, ready, error, mySeat, mode };
}
