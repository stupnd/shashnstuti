"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { ViewTransition } from "react";
import type { EntryCard } from "@/lib/entries";
import { formatShortDate } from "@/lib/dates";
import { excerpt, seeded } from "@/lib/seeded";
import { PhotoPinButton } from "./home-pins";
import { Icon, iconFor } from "./icons";
import { Avatar, PASTELS } from "./ui";

export type Span = "square" | "wide" | "tall" | "big";

/**
 * Bento sizing: mostly driven by the photo's shape, nudged by a per-entry
 * seed so the grid feels loose rather than sorted. Milestones go big.
 */
export function spanFor(entry: EntryCard): Span {
  if (entry.is_milestone) return "big";
  const cover = entry.photos[0];
  const r = seeded(entry.id, 11);
  if (!cover) return r > 0.4 ? "wide" : "square";
  const ratio = cover.width / cover.height;
  if (ratio < 0.62) return r > 0.5 ? "square" : "tall";
  if (ratio > 1.25) return r > 0.75 ? "big" : r > -0.3 ? "wide" : "square";
  return r > 0.7 ? "big" : "square";
}

const SPAN_CLASS: Record<Span, string> = {
  square: "",
  wide: "col-span-2",
  tall: "row-span-2",
  big: "col-span-2 row-span-2",
};

export function EntryTile({
  entry,
  meId,
  forceSpan,
  reveal = true,
  showPin = false,
  coverPinned = false,
}: {
  entry: EntryCard;
  meId: string;
  forceSpan?: Span;
  reveal?: boolean;
  /** Show a pushpin on the cover photo (for the book). */
  showPin?: boolean;
  coverPinned?: boolean;
}) {
  const span = forceSpan ?? spanFor(entry);
  const cover = entry.photos[0];
  const mine = entry.author === meId;
  const caption = entry.title || (entry.note ? excerpt(entry.note, span === "square" ? 34 : 70) : cover?.caption ?? "");
  const color = entry.is_milestone ? "var(--accent-soft)" : PASTELS[Math.abs(Math.round(seeded(entry.id, 5) * 10)) % PASTELS.length];
  const tilt = seeded(entry.id, 9) * 2.2;

  return (
    <div className={`relative ${SPAN_CLASS[span]}`}>
      <Link
        href={`/entry/${entry.id}`}
        transitionTypes={["nav-forward"]}
        className={`tile block h-full min-h-[9rem] ${reveal ? "reveal" : ""}`}
        style={{ "--tile": color, "--tilt": `${tilt}deg`, "--delay": `${Math.abs(seeded(entry.id, 3)) * 160}ms` } as CSSProperties}
      >
        {cover ? (
          <ViewTransition name={`photo-${cover.id}`} share="morph" default="none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover.url} alt={cover.caption ?? entry.title ?? ""} loading="lazy" className="object-center" />
          </ViewTransition>
        ) : (
          <div className="flex h-full min-h-[9rem] items-center justify-center text-muted">
            <Icon name="camera" size={28} />
          </div>
        )}

        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2">
          <span className="flex items-start gap-1.5">
            {!showPin && entry.is_milestone && (
              <span className="sticker h-8 w-8 text-accent">
                <Icon name="star" size={16} strokeWidth={2.2} />
              </span>
            )}
          </span>
          <span className="flex items-start gap-1.5">
            {showPin && entry.is_milestone && (
              <span className="sticker h-8 w-8 text-accent">
                <Icon name="star" size={16} strokeWidth={2.2} />
              </span>
            )}
            {entry.photos.length > 1 && (
              <span className="sticker h-7 px-2 text-[11px] font-bold">+{entry.photos.length - 1}</span>
            )}
          </span>
        </div>

        <div className="tile-strip">
          {caption ? (
            <p className={`font-hand leading-tight text-ink ${span === "square" ? "text-base" : "text-lg"} line-clamp-1`}>{caption}</p>
          ) : (
            <p className="font-hand text-base leading-tight text-muted">{mine ? "add a note…" : "no note yet"}</p>
          )}
          <div className="mt-0.5 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-muted">
            <span>{formatShortDate(entry.date)}</span>
            {entry.mood && <Icon name={iconFor(entry.mood, "happy")} size={12} className="text-ink" />}
            <Avatar value={entry.author_profile?.avatar_emoji} size={11} className="ml-auto text-ink" />
          </div>
        </div>
      </Link>

      {showPin && cover && (
        <div className="absolute left-2 top-2 z-10">
          <PhotoPinButton
            photoId={cover.id}
            initiallyPinned={coverPinned}
            size="sm"
            className="!shadow-[2px_2px_0_var(--ink)]"
          />
        </div>
      )}
    </div>
  );
}
