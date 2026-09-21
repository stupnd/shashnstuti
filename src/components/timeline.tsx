"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition, type CSSProperties } from "react";
import { Icon } from "@/components/icons";
import { EntryTile } from "@/components/entry-tile";
import { EmptyNote } from "@/components/ui";
import type { Cursor, EntryCard as EntryCardData } from "@/lib/entries";
import { formatShortDate, relationshipYear, relationshipYearStart } from "@/lib/dates";
import { loadMoreEntries } from "@/app/(app)/timeline/actions";

const CHAPTER_HL = ["var(--butter)", "var(--mint)", "var(--sky)", "var(--lilac)", "var(--peach)", "var(--pink)"];

/** Reveal-on-scroll for anything with .reveal inside the container. */
function useReveal(deps: unknown[]) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const els = root.querySelectorAll<HTMLElement>(".reveal:not(.in-view)");
    const io = new IntersectionObserver(
      (items) => {
        for (const it of items) {
          if (it.isIntersecting) {
            it.target.classList.add("in-view");
            io.unobserve(it.target);
          }
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.05 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

export function Timeline({
  initial,
  initialCursor,
  startDate,
  meId,
  pinnedPhotoIds = [],
}: {
  initial: EntryCardData[];
  initialCursor: Cursor | null;
  startDate: string;
  meId: string;
  pinnedPhotoIds?: string[];
}) {
  const [entries, setEntries] = useState(initial);
  const [cursor, setCursor] = useState(initialCursor);
  const [pinned, setPinned] = useState(() => new Set(pinnedPhotoIds));
  const [pending, startTransition] = useTransition();
  const sentinel = useRef<HTMLDivElement>(null);
  const root = useReveal([entries.length]);

  useEffect(() => setPinned(new Set(pinnedPhotoIds)), [pinnedPhotoIds]);

  // Infinite scroll: when the sentinel shows up, fetch the next page.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !cursor) return;
    const io = new IntersectionObserver((items) => {
      if (items[0]?.isIntersecting && !pending) {
        startTransition(async () => {
          const page = await loadMoreEntries(cursor);
          setEntries((list) => [...list, ...page.entries]);
          setCursor(page.next);
        });
      }
    }, { rootMargin: "800px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [cursor, pending]);

  // Group into chapters by relationship year (entries arrive newest-first).
  const chapters: { year: number; entries: EntryCardData[] }[] = [];
  for (const e of entries) {
    const year = relationshipYear(startDate, e.date);
    const last = chapters[chapters.length - 1];
    if (last && last.year === year) last.entries.push(e);
    else chapters.push({ year, entries: [e] });
  }

  if (entries.length === 0) {
    return <EmptyNote title="the book is empty" body="tap + to add your first moment" />;
  }

  return (
    <div ref={root} className="mt-4 space-y-14">
      {chapters.map((ch) => {
        const from = relationshipYearStart(startDate, ch.year);
        const to = relationshipYearStart(startDate, ch.year + 1);
        return (
          <section key={ch.year}>
            <header className="mb-4 flex items-end justify-between gap-3">
              <div>
                <h2 className="font-marker text-3xl"><span className="hl" style={{ "--hl": CHAPTER_HL[ch.year % CHAPTER_HL.length] } as CSSProperties}>year {ch.year}</span></h2>
                <p className="label mt-1">{formatShortDate(from)} — {formatShortDate(to)}</p>
              </div>
              <Link href={`/watch?year=${ch.year}`} transitionTypes={["nav-forward"]} className="btn btn-sky py-2 text-sm">
                <Icon name="sparkle" size={15} /> watch
              </Link>
            </header>
            <div className="bento">
              {ch.entries.map((e) => {
                const coverId = e.photos[0]?.id;
                return (
                  <EntryTile
                    key={e.id}
                    entry={e}
                    meId={meId}
                    showPin={Boolean(coverId)}
                    coverPinned={coverId ? pinned.has(coverId) : false}
                  />
                );
              })}
            </div>
          </section>
        );
      })}
      <div ref={sentinel} className="h-6" />
      {pending && <p className="label py-6 text-center">turning the page…</p>}
      {!cursor && entries.length > 0 && (
        <p className="font-marker py-8 text-center text-2xl text-muted">the beginning</p>
      )}
    </div>
  );
}
