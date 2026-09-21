"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type CSSProperties, type PointerEvent as RPointerEvent } from "react";
import { HeartBurst } from "@/components/hearts";
import { Icon, iconFor } from "@/components/icons";
import { PASTELS } from "@/components/ui";
import { addReaction } from "@/lib/actions/reactions";
import { loadMoreEntries } from "@/app/(app)/timeline/actions";
import { formatShortDate } from "@/lib/dates";
import type { Cursor, EntryCard, PhotoWithUrl } from "@/lib/entries";
import { excerpt, seeded } from "@/lib/seeded";

const THRESHOLD = 110; // px of drag before a card commits
const FLY_MS = 420;
const TAP_MS = 280;
const TAP_PX = 8;

type FlipCard = {
  key: string;
  entry: EntryCard;
  photo: PhotoWithUrl | null;
  photoIndex: number; // 0-based within the moment; -1 if no photo
};

function shuffleWith<T extends { key: string }>(list: T[], salt: number) {
  return [...list].sort((a, b) => seeded(a.key, salt) - seeded(b.key, salt));
}

/** One Tinder card per photo (or one text card if a moment has none). */
function flatten(entries: EntryCard[]): FlipCard[] {
  const out: FlipCard[] = [];
  for (const entry of entries) {
    if (entry.photos.length === 0) {
      out.push({ key: `${entry.id}:note`, entry, photo: null, photoIndex: -1 });
      continue;
    }
    entry.photos.forEach((photo, photoIndex) => {
      out.push({ key: `${entry.id}:${photo.id}`, entry, photo, photoIndex });
    });
  }
  return out;
}

/**
 * Tinder-style deck: every swipe throws the whole card away and reveals the
 * next photo. No paging through a moment's gallery first — left = skip,
 * right = heart the moment, tap = open it.
 */
export function Deck({ initial, initialCursor, shuffle }: { initial: EntryCard[]; initialCursor: Cursor | null; meId: string; shuffle: boolean }) {
  const router = useRouter();
  const [entries, setEntries] = useState(initial);
  const [cursor, setCursor] = useState(initialCursor);
  const [i, setI] = useState(0);
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false });
  const [flying, setFlying] = useState<"left" | "right" | null>(null);
  const [burst, setBurst] = useState(0);
  const [pending, startTransition] = useTransition();
  const start = useRef<{ x: number; y: number; t: number } | null>(null);
  const moved = useRef(false);
  const hearted = useRef(new Set<string>());
  const flyDist = useRef(480);

  const cards = useMemo(() => {
    const flat = flatten(entries);
    return shuffle ? shuffleWith(flat, 7) : flat;
  }, [entries, shuffle]);

  useEffect(() => {
    flyDist.current = Math.max(window.innerWidth, 320) * 1.35;
  }, []);

  // Keep the deck topped up.
  useEffect(() => {
    if (!cursor || pending || cards.length - i > 12) return;
    startTransition(async () => {
      const page = await loadMoreEntries(cursor);
      setEntries((c) => {
        const seen = new Set(c.map((e) => e.id));
        return [...c, ...page.entries.filter((e) => !seen.has(e.id))];
      });
      setCursor(page.next);
    });
  }, [i, cards.length, cursor, pending]);

  const commit = useCallback(
    (dir: "left" | "right") => {
      if (flying) return;
      const card = cards[i];
      setFlying(dir);
      if (dir === "right" && card && !hearted.current.has(card.entry.id)) {
        hearted.current.add(card.entry.id);
        setBurst((b) => b + 1);
        addReaction(card.entry.id, "heart", "").catch(() => {});
      }
      setTimeout(() => {
        setFlying(null);
        setDrag({ x: 0, y: 0, active: false });
        setI((x) => x + 1);
      }, FLY_MS);
    },
    [cards, flying, i],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") commit("right");
      if (e.key === "ArrowLeft") commit("left");
      if (e.key === "Escape") router.back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [commit, router]);

  function onDown(e: RPointerEvent) {
    if (flying) return;
    start.current = { x: e.clientX, y: e.clientY, t: performance.now() };
    moved.current = false;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({ x: 0, y: 0, active: true });
  }
  function onMove(e: RPointerEvent) {
    if (!start.current) return;
    const x = e.clientX - start.current.x;
    const y = e.clientY - start.current.y;
    if (Math.abs(x) > TAP_PX || Math.abs(y) > TAP_PX) moved.current = true;
    setDrag({ x, y, active: true });
  }
  function onUp(e: RPointerEvent) {
    if (!start.current) return;
    const dx = e.clientX - start.current.x;
    const dt = performance.now() - start.current.t;
    const velocity = Math.abs(dx) / Math.max(dt, 1);
    const wasTap = !moved.current && dt < TAP_MS;
    const card = cards[i];
    start.current = null;
    if (wasTap && card) {
      setDrag({ x: 0, y: 0, active: false });
      router.push(`/entry/${card.entry.id}`);
      return;
    }
    if (Math.abs(dx) > THRESHOLD || velocity > 0.7) commit(dx > 0 ? "right" : "left");
    else setDrag({ x: 0, y: 0, active: false });
  }

  const visible = useMemo(() => cards.slice(i, i + 3), [cards, i]);
  const top = visible[0];

  if (!top) {
    return (
      <div className="fixed inset-0 z-[45] flex flex-col items-center justify-center gap-4 bg-bg px-6 text-center">
        <p className="font-marker text-4xl">{cards.length === 0 ? "nothing to flip yet" : "that's the whole book"}</p>
        <div className="flex gap-3">
          <button type="button" onClick={() => setI(0)} className="btn btn-soft">start over</button>
          <Link href="/" className="btn btn-primary">home</Link>
        </div>
      </div>
    );
  }

  const rot = drag.x / 18;
  const like = Math.max(0, Math.min(1, drag.x / THRESHOLD));
  const nope = Math.max(0, Math.min(1, -drag.x / THRESHOLD));
  const flyX = flying === "right" ? flyDist.current : flying === "left" ? -flyDist.current : drag.x;
  const topStyle: CSSProperties = {
    transform: `translate(${flyX}px, ${flying ? drag.y - 40 : drag.y}px) rotate(${flying ? (flying === "right" ? 25 : -25) : rot}deg)`,
    transition: drag.active && !flying ? "none" : `transform ${FLY_MS}ms cubic-bezier(0.2, 0.8, 0.2, 1)`,
  };

  return (
    <div className="fixed inset-0 z-[45] flex flex-col bg-bg">
      <HeartBurst burst={burst} />

      <div className="flex items-center justify-between px-4 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <button type="button" onClick={() => router.back()} aria-label="Close" className="btn btn-ghost h-11 w-11 rounded-full p-0"><Icon name="close" size={22} /></button>
        <p className="font-marker text-2xl">flip through us</p>
        <Link href={shuffle ? "/flip" : "/flip?shuffle=1"} aria-label="Shuffle" className={`btn h-11 w-11 rounded-full p-0 ${shuffle ? "btn-mint" : "btn-ghost"}`}><Icon name="dice" size={20} /></Link>
      </div>

      <div className="relative mx-auto flex w-full max-w-md flex-1 items-center justify-center px-5 py-4" style={{ touchAction: "none" }}>
        {[...visible].reverse().map((card, k) => {
          const depth = visible.length - 1 - k; // 0 = top
          const isTop = depth === 0;
          const { entry, photo } = card;
          const color = PASTELS[Math.abs(Math.round(seeded(entry.id, 5) * 10)) % PASTELS.length];
          const text =
            photo?.caption ||
            entry.title ||
            (entry.note ? excerpt(entry.note, 80) : "");
          const style: CSSProperties = isTop
            ? topStyle
            : { transform: `translateY(${depth * 14}px) scale(${1 - depth * 0.05}) rotate(${seeded(card.key, 9) * 2}deg)`, transition: "transform 300ms" };
          const photoCount = entry.photos.length;
          return (
            <article
              key={card.key}
              className="absolute inset-x-5 top-4 bottom-4 overflow-hidden rounded-[2rem] border-[3px] border-ink bg-surface"
              style={{ ...style, boxShadow: `8px 8px 0 ${color}`, zIndex: 10 - depth }}
              onPointerDown={isTop ? onDown : undefined}
              onPointerMove={isTop ? onMove : undefined}
              onPointerUp={isTop ? onUp : undefined}
              onPointerCancel={isTop ? onUp : undefined}
            >
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo.url} alt={text || "moment"} draggable={false} className="h-full w-full object-cover" style={{ objectPosition: "50% 30%" }} />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 bg-bg-soft px-8 text-center">
                  <Icon name="camera" size={40} className="text-muted" />
                  <p className="font-hand text-3xl leading-snug">{text || "no note yet"}</p>
                </div>
              )}

              {isTop && (
                <>
                  <span className="absolute left-5 top-6 rotate-[-14deg] rounded-xl border-4 border-[#3ec98f] px-3 py-1 font-marker text-3xl text-[#3ec98f]" style={{ opacity: like }}>love</span>
                  <span className="absolute right-5 top-6 rotate-[14deg] rounded-xl border-4 border-[#ff7a7a] px-3 py-1 font-marker text-3xl text-[#ff7a7a]" style={{ opacity: nope }}>next</span>
                </>
              )}

              <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
                {entry.is_milestone ? <span className="sticker h-9 w-9 text-accent"><Icon name="star" size={18} strokeWidth={2.2} /></span> : <span />}
                {photoCount > 1 && card.photoIndex >= 0 && (
                  <span className="sticker h-8 px-2.5 text-xs font-bold">{card.photoIndex + 1}/{photoCount}</span>
                )}
              </div>

              <div className="absolute inset-x-0 bottom-0 border-t-[3px] border-ink bg-surface/95 p-4 backdrop-blur-sm">
                <p className="font-hand text-2xl leading-tight line-clamp-2">{text || "no note yet"}</p>
                <div className="mt-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
                  <span>{formatShortDate(entry.date)}</span>
                  {entry.place && <span>· {entry.place}</span>}
                  {entry.mood && <Icon name={iconFor(entry.mood, "happy")} size={13} className="text-ink" />}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
        <button type="button" onClick={() => commit("left")} aria-label="Next" className="btn btn-soft h-14 w-14 rounded-full p-0"><Icon name="close" size={24} strokeWidth={2.4} /></button>
        <Link href={`/entry/${top.entry.id}`} transitionTypes={["nav-forward"]} className="btn btn-sky h-12 rounded-full px-5">open</Link>
        <button type="button" onClick={() => commit("right")} aria-label="Love it" className="btn btn-primary h-14 w-14 rounded-full p-0"><Icon name="heartFilled" size={26} /></button>
      </div>
      <p className="label pb-2 text-center text-[9px]">{i + 1} / {cards.length}{cursor ? "+" : ""}</p>
    </div>
  );
}
