"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
}: {
  photos: PhotoWithUrl[];
  alt: string;
  /** When given, the author can delete the photo they're looking at. */
  onDelete?: (photoId: string) => Promise<void>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const count = photos.length;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => setIndex(Math.round(el.scrollLeft / el.clientWidth));
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

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
      setIndex((i) => Math.max(0, Math.min(i, count - 2)));
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  }

  return (
    <div className="relative">
      <div ref={ref} className="swiper bg-bg-soft">
        {photos.map((p, i) => (
          <div key={p.id} className="flex items-center justify-center" style={{ height: "min(72vh, 640px)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.url}
              alt={p.caption ?? (count > 1 ? `${alt} (${i + 1} of ${count})` : alt)}
              width={p.width}
              height={p.height}
              className="h-full w-full object-contain"
              loading={i === 0 ? "eager" : "lazy"}
            />
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
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {photos.map((p, i) => (
              <span key={p.id} className={`h-1.5 rounded-full transition-all ${i === index ? "w-5 bg-ink" : "w-1.5 bg-ink/30"}`} />
            ))}
          </div>
        </>
      )}

      {onDelete && !confirming && (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          aria-label="Delete this photo"
          className="pill absolute right-3 top-3 flex h-9 w-9 items-center justify-center text-muted hover:text-accent"
        >
          <Icon name="trash" size={17} />
        </button>
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

      {(current?.caption || count > 1) && (
        <div className="flex items-baseline justify-between px-1 pt-3">
          <p className="font-hand text-xl text-ink">{current?.caption ?? ""}</p>
          {count > 1 && <span className="label">{index + 1} / {count}</span>}
        </div>
      )}
    </div>
  );
}
