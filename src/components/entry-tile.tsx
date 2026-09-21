import Link from "next/link";
import type { EntryCard } from "@/lib/entries";
import { formatShortDate } from "@/lib/dates";
import { excerpt, seeded } from "@/lib/seeded";
import { Icon, iconFor } from "./icons";
import { Avatar } from "./ui";

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
  // Cells are square, so: very tall shots (9:16 screenshots) → 1×2 column,
  // landscape → 2×1 strip or square, everything else → square, with the
  // occasional 2×2 so the grid doesn't look sorted.
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

export function EntryTile({ entry, meId, forceSpan, reveal = true }: { entry: EntryCard; meId: string; forceSpan?: Span; reveal?: boolean }) {
  const span = forceSpan ?? spanFor(entry);
  const cover = entry.photos[0];
  const mine = entry.author === meId;
  const caption = entry.title || (entry.note ? excerpt(entry.note, span === "square" ? 40 : 90) : cover?.caption ?? "");

  return (
    <Link
      href={`/entry/${entry.id}`}
      className={`tile group ${reveal ? "reveal" : ""} ${SPAN_CLASS[span]}`}
      style={{ transitionDelay: `${Math.abs(seeded(entry.id, 3)) * 120}ms` }}
    >
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover.url} alt={cover.caption ?? entry.title ?? ""} loading="lazy" style={{ objectPosition: "50% 30%" }} />
      ) : (
        <div className="flex h-full items-center justify-center text-muted"><Icon name="camera" size={28} /></div>
      )}
      <div className="tile-fade" />

      <div className="absolute inset-x-0 top-0 flex items-start justify-between p-2.5">
        {entry.is_milestone ? (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-accent"><Icon name="sparkle" size={15} /></span>
        ) : <span />}
        {entry.photos.length > 1 && (
          <span className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-ink">+{entry.photos.length - 1}</span>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 p-3 text-white">
        {caption ? (
          <p className={`font-hand leading-tight ${span === "square" ? "text-lg" : "text-xl"} line-clamp-2`}>{caption}</p>
        ) : (
          <p className="font-hand text-lg leading-tight text-white/80">{mine ? "add a note…" : "no note yet"}</p>
        )}
        <div className="mt-1 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-white/80">
          <span>{formatShortDate(entry.date)}</span>
          {entry.mood && <Icon name={iconFor(entry.mood, "happy")} size={13} />}
          <Avatar value={entry.author_profile?.avatar_emoji} size={12} className="ml-auto" />
        </div>
      </div>
    </Link>
  );
}
