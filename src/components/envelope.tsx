"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { openLetter } from "@/lib/actions/letters";
import { Icon } from "./icons";

type Props = {
  id: string;
  title: string;
  from: string;
  /** "sealed" = unopened & addressed to me; "open" = already opened / mine; "locked" = future */
  state: "sealed" | "open" | "locked";
  unlockAt?: string | null;
};

function useCountdown(iso: string | null | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!iso) return null;
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return "unlocking…";
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m ${s}s`;
}

export function Envelope({ id, title, from, state, unlockAt }: Props) {
  const router = useRouter();
  const [opening, setOpening] = useState(false);
  const [pending, start] = useTransition();
  const countdown = useCountdown(unlockAt);

  function onClick() {
    if (state === "locked") return;
    if (state === "open") return router.push(`/letters/${id}`);
    setOpening(true);
    start(async () => {
      await openLetter(id);
      setTimeout(() => router.push(`/letters/${id}`), 900);
    });
  }

  const paper = state === "locked" ? "bg-bg-soft" : "bg-surface";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={state === "locked" || pending}
      aria-label={state === "locked" ? `${title}, locked` : `Open letter: ${title}`}
      className={`envelope group block w-full text-left ${opening ? "opening" : ""} ${state === "locked" ? "cursor-default" : ""}`}
    >
      <div className={`relative aspect-[3/2] w-full overflow-hidden rounded-2xl border border-line ${paper} shadow-[var(--shadow-card)]`}>
        <div className="envelope-letter absolute inset-x-4 bottom-0 top-3 rounded-t-lg border border-line bg-white">
          <p className="font-hand px-3 pt-2 text-lg text-muted">{title}</p>
        </div>
        <div className={`absolute inset-x-0 bottom-0 h-[62%] border-t border-line ${paper}`} style={{ clipPath: "polygon(0 0, 50% 45%, 100% 0, 100% 100%, 0 100%)" }} />
        <div className={`envelope-flap absolute inset-x-0 top-0 h-[55%] origin-top border-b border-line ${paper}`} style={{ clipPath: "polygon(0 0, 100% 0, 50% 100%)" }} />
        <span className="envelope-seal absolute left-1/2 top-[48%] -translate-x-1/2 -translate-y-1/2 text-accent">
          <Icon name={state === "locked" ? "lock" : "heartFilled"} size={state === "locked" ? 22 : 26} />
        </span>
        {state === "open" && <span className="label absolute right-3 top-2 text-[9px]">opened</span>}
      </div>
      <p className="mt-2 text-sm font-semibold leading-tight">{title}</p>
      <p className="label mt-0.5">{state === "locked" ? `unlocks in ${countdown ?? "…"}` : `from ${from}`}</p>
    </button>
  );
}
