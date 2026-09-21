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

export function PinButton({
  pinned,
  busy,
  onToggle,
  className = "",
  size = "md",
}: {
  pinned: boolean;
  busy?: boolean;
  onToggle: () => void;
  className?: string;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "h-8 w-8" : "h-9 w-9";
  const icon = size === "sm" ? 14 : 16;
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
      className={`sticker ${dim} transition-transform hover:scale-110 disabled:opacity-100 ${
        pinned ? "bg-accent text-ink ring-2 ring-ink" : "bg-surface text-ink"
      } ${className}`}
    >
      <Icon name="pushpin" size={icon} strokeWidth={2.4} />
    </button>
  );
}

/** Pin / unpin a single photo — used on tiles and the entry viewer. */
export function PhotoPinButton({
  photoId,
  initiallyPinned,
  size = "md",
  className = "",
  onChange,
}: {
  photoId: string;
  initiallyPinned: boolean;
  size?: "sm" | "md";
  className?: string;
  onChange?: (pinned: boolean) => void;
}) {
  const router = useRouter();
  const [pinned, setPinned] = useState(initiallyPinned);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setPinned(initiallyPinned), [photoId, initiallyPinned]);

  return (
    <span className="relative inline-flex flex-col items-start gap-1">
      <PinButton
        pinned={pinned}
        busy={pending}
        size={size}
        className={className}
        onToggle={() => {
          setError(null);
          start(async () => {
            const next = !pinned;
            setPinned(next);
            onChange?.(next);
            const res = await toggleHomePin(photoId);
            if ("error" in res) {
              setPinned(!next);
              onChange?.(!next);
              setError(res.error);
              return;
            }
            setPinned(res.pinned);
            onChange?.(res.pinned);
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

/** Fridge tile on home — tap the pin to unpin. */
export function HomePinTile({
  pin,
  onUnpinned,
}: {
  pin: HomePinCard;
  onUnpinned?: (photoId: string) => void;
}) {
  const color = PASTELS[Math.abs(Math.round(seeded(pin.photoId, 5) * 10)) % PASTELS.length];
  const tilt = seeded(pin.photoId, 9) * 2.2;
  const caption = pin.caption || pin.title || formatShortDate(pin.date);
  const ratio = pin.width / pin.height;
  const span = ratio < 0.7 ? "row-span-2" : ratio > 1.3 ? "col-span-2" : "";

  return (
    <div className={`relative ${span}`}>
      <Link
        href={`/entry/${pin.entryId}`}
        transitionTypes={["nav-forward"]}
        className="tile block h-full min-h-[9rem]"
        style={{ "--tile": color, "--tilt": `${tilt}deg` } as CSSProperties}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={pin.url} alt={caption} loading="lazy" style={{ objectPosition: "50% 30%" }} />
        <div className="tile-strip">
          <p className="font-hand line-clamp-1 text-lg leading-tight text-ink">{caption}</p>
          <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-muted">{formatShortDate(pin.date)}</p>
        </div>
      </Link>
      <div className="absolute right-2 top-2 z-10">
        <PhotoPinButton
          photoId={pin.photoId}
          initiallyPinned
          size="sm"
          className="!shadow-[2px_2px_0_var(--ink)]"
          onChange={(pinned) => {
            if (!pinned) onUnpinned?.(pin.photoId);
          }}
        />
      </div>
    </div>
  );
}

/** Home fridge grid with live unpin. */
export function HomePinsGrid({ initial }: { initial: HomePinCard[] }) {
  const [pins, setPins] = useState(initial);
  useEffect(() => setPins(initial), [initial]);

  if (pins.length === 0) {
    return (
      <Link
        href="/pins"
        transitionTypes={["nav-forward"]}
        className="dashed flex flex-col items-center gap-2 px-4 py-10 text-center transition-transform hover:-translate-y-0.5"
      >
        <span className="sticker h-14 w-14 bg-peach text-ink">
          <Icon name="pushpin" size={24} />
        </span>
        <p className="font-marker text-2xl leading-tight">pin your favorites</p>
        <p className="max-w-xs text-sm text-muted">go through photos and pushpin the ones you want on home</p>
      </Link>
    );
  }

  return (
    <div className="bento">
      {pins.map((p) => (
        <HomePinTile key={p.photoId} pin={p} onUnpinned={(id) => setPins((list) => list.filter((x) => x.photoId !== id))} />
      ))}
    </div>
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
  const [busyId, setBusyId] = useState<string | null>(null);
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
    setBusyId(photoId);
    start(async () => {
      setOptimistic({ id: photoId, pinned: !currentlyPinned });
      const res = await toggleHomePin(photoId);
      setBusyId(null);
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
          <Icon name="pushpin" size={12} strokeWidth={2.4} />
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
                <PinButton pinned={p.pinned} busy={busyId === p.photoId} onToggle={() => toggle(p.photoId, p.pinned)} />
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

/** @deprecated use PhotoPinButton */
export function EntryPinButton(props: { photoId: string; initiallyPinned: boolean }) {
  return <PhotoPinButton {...props} className="!shadow-[2px_2px_0_var(--ink)]" />;
}
