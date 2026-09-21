"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Icon } from "@/components/icons";
import { formatLongDate } from "@/lib/dates";
import type { Slide } from "@/lib/entries";
import { seeded } from "@/lib/seeded";

const SLIDE_MS = 6000;

/**
 * Cinematic slideshow: Ken Burns drift, crossfades, captions writing in.
 * Tap right/left thirds to skip, middle to pause; ← → and space on a keyboard.
 */
export function WatchPlayer({ slides, label }: { slides: Slide[]; label: string }) {
  const router = useRouter();
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const startedAt = useRef<number>(0);
  const elapsedBeforePause = useRef(0);
  const count = slides.length;

  const go = useCallback(
    (d: number) => {
      setI((x) => (x + d + count) % count);
      elapsedBeforePause.current = 0;
      startedAt.current = performance.now();
      setProgress(0);
    },
    [count],
  );

  // Timer + progress bar (rAF so pausing is exact).
  useEffect(() => {
    if (count === 0) return;
    let raf = 0;
    startedAt.current = performance.now() - elapsedBeforePause.current;
    const tick = (now: number) => {
      if (!paused) {
        const elapsed = now - startedAt.current;
        setProgress(Math.min(1, elapsed / SLIDE_MS));
        if (elapsed >= SLIDE_MS) {
          go(1);
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [i, paused, count, go]);

  function togglePause() {
    if (paused) startedAt.current = performance.now() - elapsedBeforePause.current;
    else elapsedBeforePause.current = performance.now() - startedAt.current;
    setPaused((p) => !p);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === " ") { e.preventDefault(); togglePause(); }
      if (e.key === "Escape") router.back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [go, paused]);

  // Preload the next two images.
  useEffect(() => {
    for (const k of [1, 2]) {
      const s = slides[(i + k) % count];
      if (s) { const img = new Image(); img.src = s.url; }
    }
  }, [i, slides, count]);

  if (count === 0) {
    return (
      <div className="fixed inset-0 z-[45] flex flex-col items-center justify-center bg-ink text-white">
        <p className="font-marker text-3xl">nothing to watch yet</p>
        <Link href="/" className="btn btn-soft mt-6">home</Link>
      </div>
    );
  }

  const s = slides[i];
  const k = `${s.photoId}`;
  const pan = { "--kx0": `${seeded(k, 1) * 2}%`, "--ky0": `${seeded(k, 2) * 2}%`, "--kx1": `${seeded(k, 3) * 3}%`, "--ky1": `${seeded(k, 4) * 3}%`, "--dur": `${SLIDE_MS + 800}ms` } as CSSProperties;
  const text = s.caption ?? s.title ?? (s.note ? s.note.slice(0, 80) : "");

  return (
    <div
      className="fixed inset-0 z-[45] select-none overflow-hidden bg-[#14101a] text-white"
      onClick={(e) => {
        const x = e.clientX / window.innerWidth;
        if (x < 0.25) go(-1);
        else if (x > 0.75) go(1);
        else togglePause();
      }}
    >
      {/* blurred backdrop */}
      <div key={`bg-${i}`} className="slide-fade absolute inset-0 scale-110 bg-cover bg-center opacity-50 blur-2xl" style={{ backgroundImage: `url(${s.url})` }} />

      {/* photo */}
      <div key={`ph-${i}`} className="slide-fade absolute inset-0 flex items-center justify-center p-4 pb-32 pt-16">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={s.url}
          alt={text}
          className={`kenburns max-h-full max-w-full rounded-2xl object-contain shadow-[0_30px_80px_-20px_rgb(0_0_0/0.7)] ${paused ? "[animation-play-state:paused]" : ""}`}
          style={pan}
        />
      </div>

      {/* top bar */}
      <div className="absolute inset-x-0 top-0 flex items-center gap-3 px-4 pt-[calc(0.75rem+env(safe-area-inset-top))]" onClick={(e) => e.stopPropagation()}>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/25">
          <div className="h-full rounded-full bg-white transition-[width] duration-100" style={{ width: `${progress * 100}%` }} />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/70">{label} · {i + 1}/{count}</span>
        <button type="button" onClick={() => router.back()} aria-label="Close" className="ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
          <Icon name="close" size={18} strokeWidth={2.2} />
        </button>
      </div>

      {/* caption */}
      <div key={`cap-${i}`} className="absolute inset-x-0 bottom-0 px-6 pb-[calc(2rem+env(safe-area-inset-bottom))]">
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/70">
          {formatLongDate(s.date)}{s.place ? ` · ${s.place}` : ""}{s.milestone ? " · milestone" : ""}
        </p>
        {text && <p className="type-in font-hand mt-1 text-3xl leading-tight sm:text-4xl">{text}</p>}
        <Link
          href={`/entry/${s.entryId}`}
          onClick={(e) => e.stopPropagation()}
          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-white/70 hover:text-white"
        >
          open this moment <Icon name="back" size={12} className="rotate-180" />
        </Link>
      </div>

      {paused && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="sticker h-16 w-16 text-ink"><Icon name="sparkle" size={28} /></span>
        </div>
      )}
    </div>
  );
}
