"use client";

import { useCallback, useRef } from "react";
import { recordMatchResult } from "@/lib/play/scoreboard-store";
import type { BaseState, GameId } from "@/lib/play/types";

/** Persist game state and tally a newly finished match once. */
export function useRecordOnFinish(gameId: GameId) {
  const locking = useRef(false);

  return useCallback(
    async (next: BaseState, persist: (s: BaseState) => Promise<void>) => {
      if (next.status === "finished" && !next.scored && next.winner) {
        if (locking.current) {
          await persist(next);
          return;
        }
        locking.current = true;
        const aId = next.seats.a;
        const bId = next.seats.b;
        if (aId && bId) {
          try {
            await recordMatchResult(gameId, aId, bId, next.winner);
          } catch {
            /* still mark scored */
          }
        }
        await persist({ ...next, scored: true });
        locking.current = false;
        return;
      }
      await persist(next);
    },
    [gameId],
  );
}
