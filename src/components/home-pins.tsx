"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useOptimistic, useRef, useState, useTransition, type CSSProperties } from "react";
import { Icon } from "@/components/icons";
import { toggleHomePin } from "@/lib/actions/home-pins";
import { formatShortDate } from "@/lib/dates";
import { PASTELS } from "@/components/ui";
import { seeded } from "@/lib/seeded";
import type { HomePinCard, PinBrowsePhoto } from "@/lib/home-pins";
import { loadMorePinPhotos } from "@/app/(app)/pins/actions";

function PinButton({
  pinned,
  busy,
  onToggle,
  className = "",
}: {
  pinned: boolean;
  busy?: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      aria-pressed={pinned}
      aria-label={pinned ? "Unpin from home" : "Pin to home"}
      className={`sticker h-9 w-9 transition-transform hover:scale-110 ${pinned ? "bg-accent text-white" : "bg-surface text-ink"} ${className}`}
    >
      <Icon name={pinned ? "pushpinFilled" : "pushpin"} size={16} strokeWidth={2.2} />
    </button>
  );
}

/** Single photo tile on home — links to its moment. */
export function HomePinTile({ pin }: { pin: HomePinCard }) {
  const color = PASTELS[Math.abs(Math.round(seeded(pin.photoId, 5) * 10)) % PASTELS.length];
  const tilt = seeded(pin.photoId, 9) * 2.2;
  const caption = pin.caption || pin.title || formatShortDate(pin.date);
  const ratio = pin.width / pin.height;
  const span =
    ratio < 0.7 ? "row-span-2" : ratio > 1.3 ? "col-span-2" : "";

  return (
    <Link
      href={`/entry/${pin.entryId}`}
      transitionTypes={["nav-forward"]}
      className={`tile ${span}`}
      style={{ "--tile": color, "--tilt": `${tilt}deg` } as CSSProperties}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={pin.url} alt={caption} loading="lazy" style={{ objectPosition: "50% 30%" }} />
      <span className="absolute right-2 top-2 sticker h-8 w-8 bg-accent text-white">
        <Icon name="pushpinFilled" size={14} />
      </span>
      <div className="tile-strip">
        <p className="font-hand line-clamp-1 text-lg leading-tight text-ink">{caption}</p>
        <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-muted">{formatShortDate(pin.date)}</p>
      </div>
    </Link>
  );
}

/** Browse grid: tap the pushpin to pin/unpin. Tap the photo to open the moment. */
export function PinPicker({
  initial,
  initialCursor,
  initialPinnedCount,
}: {
  initial: PinBrowsePhoto[];
  initialCursor: { date: string; created_at: string } | null;
  initialPinnedCount: number;
}) {
  const router = useRouter();
  const [photos, setPhotos] = useState(initial);
  const [cursor, setCursor] = useState(initialCursor);
  const [pinnedCount, setPinnedCount] = useState(initialPinnedCount);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(
    photos,
    (cur, update: { id: string; pinned: boolean }) =>
      cur.map((p) => (p.photoId === update.id ? { ...p, pinned: update.pinned } : p)),
  );
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !cursor) return;
    const io = new IntersectionObserver(
      (items) => {
        if (items[0]?.isIntersecting && !pending) {
          start(async () => {
            const page = await loadMorePinPhotos(cursor);
            setPhotos((list) => {
              const seen = new Set(list.map((p) => p.photoId));
              return [...list, ...page.photos.filter((p) => !seen.has(p.photoId))];
            });
            setCursor(page.next);
          });
        }
      },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [cursor, pending]);

  function toggle(photoId: string, currentlyPinned: boolean) {
    setError(null);
    start(async () => {
      setOptimistic({ id: photoId, pinned: !currentlyPinned });
      const res = await toggleHomePin(photoId);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setPhotos((list) => list.map((p) => (p.photoId === photoId ? { ...p, pinned: res.pinned } : p)));
      setPinnedCount((c) => c + (res.pinned ? 1 : -1));
      router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          tap the <Icon name="pushpin" size={14} className="inline align-[-2px]" /> to pin a photo to home
        </p>
        <span className="chip pointer-events-none text-xs" style={{ background: "var(--pink)" }}>
          <Icon name="pushpinFilled" size={12} />
          {pinnedCount} pinned
        </span>
      </div>

      {error && (
        <p className="mb-3 text-sm text-accent" role="alert">
          {error}
        </p>
      )}

      {optimistic.length === 0 ? (
        <p className="text-sm text-muted">no photos yet — add a moment first.</p>
      ) : (
        <ul className="stagger-in grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {optimistic.map((p) => (
            <li key={p.photoId} className="relative">
              <Link
                href={`/entry/${p.entryId}`}
                transitionTypes={["nav-forward"]}
                className={`tile block aspect-square ${p.pinned ? "ring-2 ring-accent ring-offset-2 ring-offset-bg" : ""}`}
                style={
                  {
                    "--tile": PASTELS[Math.abs(Math.round(seeded(p.photoId, 4) * 10)) % PASTELS.length],
                    "--tilt": `${seeded(p.photoId, 7) * 1.6}deg`,
                  } as CSSProperties
                }
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={p.caption ?? p.title ?? ""} className="h-full w-full object-cover" loading="lazy" />
                <div className="tile-strip">
                  <p className="font-hand line-clamp-1 text-base leading-tight">{p.caption || p.title || formatShortDate(p.date)}</p>
                </div>
              </Link>
              <div className="absolute left-2 top-2 z-10">
                <PinButton pinned={p.pinned} busy={pending} onToggle={() => toggle(p.photoId, p.pinned)} />
              </div>
            </li>
          ))}
        </ul>
      )}

      <div ref={sentinel} className="h-8" />
      {pending && cursor && <p className="label py-4 text-center">loading more…</p>}
    </div>
  );
}

/** Pin control for the entry photo swiper. */
export function EntryPinButton({ photoId, initiallyPinned }: { photoId: string; initiallyPinned: boolean }) {
  const router = useRouter();
  const [pinned, setPinned] = useState(initiallyPinned);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setPinned(initiallyPinned), [photoId, initiallyPinned]);

  return (
    <span className="relative inline-flex flex-col items-end gap-1">
      <PinButton
        pinned={pinned}
        busy={pending}
        className="!shadow-[2px_2px_0_var(--ink)]"
        onToggle={() => {
          setError(null);
          start(async () => {
            const next = !pinned;
            setPinned(next);
            const res = await toggleHomePin(photoId);
            if ("error" in res) {
              setPinned(!next);
              setError(res.error);
              return;
            }
            setPinned(res.pinned);
            router.refresh();
          });
        }}
      />
      {error && (
        <span className="pill max-w-[11rem] px-2 py-1 text-[10px] font-semibold text-accent" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}
