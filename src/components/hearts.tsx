"use client";

import { useEffect, useState } from "react";
import { seeded } from "@/lib/seeded";
import { Icon } from "./icons";

type Heart = { id: number; x: number; delay: number; size: number; filled: boolean };

/** Deterministic per-burst positions (keeps render pure; still looks random). */
function makeHearts(burst: number): Heart[] {
  return Array.from({ length: 12 }, (_, i) => {
    const k = `${burst}-${i}`;
    return {
      id: burst * 100 + i,
      x: 50 + seeded(k, 1) * 40,
      delay: (seeded(k, 2) + 1) * 0.3,
      size: 22 + (seeded(k, 3) + 1) * 12,
      filled: seeded(k, 4) > 0.2,
    };
  });
}

/** Little ink hearts floating up. Bump `burst` (a counter) to fire again. */
export function HeartBurst({ burst }: { burst: number }) {
  const [finished, setFinished] = useState(0);

  useEffect(() => {
    if (!burst) return;
    const t = setTimeout(() => setFinished(burst), 2600);
    return () => clearTimeout(t);
  }, [burst]);

  if (!burst || finished === burst) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden" aria-hidden>
      {makeHearts(burst).map((h) => (
        <span
          key={h.id}
          className="heart-float absolute bottom-0 text-accent"
          style={{ left: `${h.x}%`, animationDelay: `${h.delay}s` }}
        >
          <Icon name={h.filled ? "heartFilled" : "heart"} size={h.size} />
        </span>
      ))}
    </div>
  );
}
