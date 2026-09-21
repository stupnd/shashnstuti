"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { emptyScoreboard, parseScoreboard, type ScoreboardState } from "./scores";
import { loadScoreboard, resetScoreboard } from "./scoreboard-store";

export function useScoreboard() {
  const [board, setBoard] = useState<ScoreboardState>(emptyScoreboard);
  const [ready, setReady] = useState(false);
  const [remote, setRemote] = useState(false);

  const refresh = useCallback(async () => {
    const { board: next, remote: hasRemote } = await loadScoreboard();
    setBoard(next);
    setRemote(hasRemote);
    setReady(true);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!remote) return;
    const supabase = createClient();
    const channel = supabase
      .channel("scoreboard")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "game_sessions", filter: "id=eq.scoreboard" },
        (payload) => {
          const row = payload.new as { state?: unknown };
          setBoard(parseScoreboard(row.state));
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [remote]);

  // Also refresh when returning to the hub (storage event from other tabs / same origin writes).
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "scrapbook-game-scores") void refresh();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refresh]);

  const resetAll = useCallback(async () => {
    const next = await resetScoreboard();
    setBoard(next);
  }, []);

  return { board, ready, remote, resetAll, refresh };
}
