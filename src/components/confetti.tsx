"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { seeded } from "@/lib/seeded";

const COLORS = ["var(--accent)", "var(--violet)", "var(--butter)", "var(--mint)", "var(--sky)", "var(--peach)"];

/** One-shot confetti rain that removes itself once it has fallen. */
export function Confetti({ count = 80 }: { count?: number }) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDone(true), 7000);
    return () => clearTimeout(t);
  }, []);
  if (done) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-[55] overflow-hidden" aria-hidden>
      {Array.from({ length: count }, (_, i) => {
        const k = `c${i}`;
        return (
          <span
            key={i}
            className="confetti absolute block rounded-sm"
            style={{
              top: "-4vh",
              left: `${(seeded(k, 1) + 1) * 50}%`,
              width: 8 + (seeded(k, 2) + 1) * 4,
              height: 10 + (seeded(k, 3) + 1) * 6,
              background: COLORS[Math.abs(Math.round(seeded(k, 4) * 10)) % COLORS.length],
              "--dur": `${3 + (seeded(k, 5) + 1) * 1.5}s`,
              "--delay": `${(seeded(k, 6) + 1) * 1.2}s`,
            } as CSSProperties}
          />
        );
      })}
    </div>
  );
}
