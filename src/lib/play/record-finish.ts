"use client";

import { useCallback, useRef } from "react";
import { recordMatchResult } from "@/lib/play/scoreboard-store";
import type { BaseState, GameId, PlayMode, PlayerInfo } from "@/lib/play/types";

function idsForSeats(
  mode: PlayMode,
  me: PlayerInfo,
  partner: PlayerInfo | null,
  seats: BaseState["seats"],
): { aId: string; bId: string } | null {
  if (mode === "pass") {
    return { aId: me.id, bId: partner?.id ?? "player-2" };
  }
  if (!seats.a || !seats.b) return null;
  return { aId: seats.a, bId: seats.b };
}

/** Persist game state and tally a newly finished match once. */
export function useRecordOnFinish(
  gameId: GameId,
  mode: PlayMode,
  me: PlayerInfo,
  partner: PlayerInfo | null,
) {
  const locking = useRef(false);

  return useCallback(
    async (next: BaseState, persist: (s: BaseState) => Promise<void>) => {
      if (next.status === "finished" && !next.scored && next.winner) {
        if (locking.current) {
          await persist(next);
          return;
        }
        locking.current = true;
        const ids = idsForSeats(mode, me, partner, next.seats);
        if (ids) {
          try {
            await recordMatchResult(gameId, ids.aId, ids.bId, next.winner);
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
    [gameId, me, mode, partner],
  );
}
