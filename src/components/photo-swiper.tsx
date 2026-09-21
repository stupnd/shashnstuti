"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ViewTransition } from "react";
import type { PhotoWithUrl } from "@/lib/entries";
import { Icon } from "./icons";

/**
 * Full-width photo viewer. Swipe on phones (native scroll-snap), arrows on
 * desktop, ← → on a keyboard. Photos are never cropped here — object-contain.
 */
export function PhotoSwiper({
  photos,
  alt,
  onDelete,
  onMove,
}: {
  photos: PhotoWithUrl[];
  alt: string;
  /** When given, the author can delete the photo they're looking at. */
  onDelete?: (photoId: string) => Promise<void>;
  /** When given, the author can move the current photo to another date. */
  onMove?: (photoId: string, date: string) => Promise<void>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [moving, setMoving] = useState(false);
  const [moveDate, setMoveDate] = useState("");
  const [busy, setBusy] = useState(false);
  const count = photos.length;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => setIndex(Math.round(el.scrollLeft / el.clientWidth));
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // After a delete (or any change in the set), snap to a valid slide so an
  // empty slot never lingers on screen.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const next = Math.min(index, Math.max(0, count - 1));
    if (next !== index) setIndex(next);
    el.scrollTo({ left: next * el.clientWidth, behavior: "instant" as ScrollBehavior });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  const go = useCallback(
    (d: number) => {
      const el = ref.current;
      if (!el) return;
      const next = Math.min(count - 1, Math.max(0, index + d));
      el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
    },
    [count, index],
  );

  useEffect(() => {
    if (count < 2) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [count, go]);

  if (count === 0) {
    return (
      <div className="flex aspect-square items-center justify-center bg-bg-soft text-muted">
        <Icon name="camera" size={40} strokeWidth={1.2} />
      </div>
    );
  }

  const current = photos[index];

  async function confirmDelete() {
    if (!onDelete || !current) return;
    setDeleting(true);
    try {
      await onDelete(current.id);
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  }

  return (
    <div>
      <div className="relative">
      <div ref={ref} className="swiper bg-bg-soft" style={{ height: "min(72vh, 640px)" }}>
        {photos.map((p, i) => (
          <div key={p.id} className="flex items-center justify-center" style={{ height: "min(72vh, 640px)" }}>
            <ViewTransition name={`photo-${p.id}`} share="morph" default="none">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.url}
                alt={p.caption ?? (count > 1 ? `${alt} (${i + 1} of ${count})` : alt)}
                width={p.width}
                height={p.height}
                className="h-full w-full object-contain"
                loading={i === 0 ? "eager" : "lazy"}
              />
            </ViewTransition>
          </div>
        ))}
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            disabled={index === 0}
            aria-label="Previous photo"
            className="pill absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center text-ink disabled:opacity-0"
          >
            <Icon name="back" size={18} />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            disabled={index === count - 1}
            aria-label="Next photo"
            className="pill absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center text-ink disabled:opacity-0"
          >
            <Icon name="back" size={18} className="rotate-180" />
          </button>
          {count <= 10 ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
              {photos.map((p, i) => (
                <span key={p.id} className={`h-1.5 rounded-full transition-all ${i === index ? "w-5 bg-ink" : "w-1.5 bg-ink/30"}`} />
              ))}
            </div>
          ) : (
            <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-bold text-ink">
              {index + 1} / {count}
            </span>
          )}
        </>
      )}

      {(onDelete || onMove) && !confirming && !moving && (
        <div className="absolute right-3 top-3 flex gap-2">
          {onMove && (
            <button type="button" onClick={() => setMoving(true)} aria-label="Move this photo to another date" className="pill flex h-9 w-9 items-center justify-center text-muted hover:text-ink">
              <Icon name="edit" size={16} />
            </button>
          )}
          {onDelete && (
            <button type="button" onClick={() => setConfirming(true)} aria-label="Delete this photo" className="pill flex h-9 w-9 items-center justify-center text-muted hover:text-accent">
              <Icon name="trash" size={17} />
            </button>
          )}
        </div>
      )}
      {moving && (
        <div className="pill absolute inset-x-3 top-3 flex flex-wrap items-center justify-between gap-2 py-2 pl-4 pr-2 text-sm">
          <span className="font-semibold">move this photo to</span>
          <span className="flex items-center gap-1">
            <input type="date" value={moveDate} onChange={(e) => setMoveDate(e.target.value)} className="input w-auto py-1 text-sm" autoFocus />
            <button type="button" onClick={() => setMoving(false)} disabled={busy} className="btn btn-ghost py-1.5">cancel</button>
            <button
              type="button"
              disabled={busy || !moveDate}
              onClick={async () => {
                if (!onMove || !current) return;
                setBusy(true);
                try { await onMove(current.id, moveDate); } finally { setBusy(false); setMoving(false); }
              }}
              className="btn btn-primary py-1.5"
            >
              {busy ? "moving…" : "move"}
            </button>
          </span>
        </div>
      )}
      {confirming && (
        <div className="pill absolute inset-x-3 top-3 flex items-center justify-between gap-2 py-2 pl-4 pr-2 text-sm">
          <span>delete this photo?</span>
          <span className="flex gap-1">
            <button type="button" onClick={() => setConfirming(false)} disabled={deleting} className="btn btn-ghost py-1.5">keep</button>
            <button type="button" onClick={confirmDelete} disabled={deleting} className="btn btn-primary py-1.5">
              {deleting ? "deleting…" : "delete"}
            </button>
          </span>
        </div>
      )}

      </div>

      {current?.caption && (
        <div className="border-t-2 border-ink bg-white px-4 py-2.5">
          <p className="font-hand text-xl leading-tight text-ink">{current.caption}</p>
        </div>
      )}
    </div>
  );
}
