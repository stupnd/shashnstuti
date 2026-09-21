"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition, type ReactNode } from "react";
import { saveWrappedCustom } from "@/lib/actions/wrapped";
import { formatShortDate } from "@/lib/dates";
import { Icon, iconFor } from "@/components/icons";
import type { WrappedStats } from "@/lib/wrapped";

type Slide = { bg: string; fg?: string; content: ReactNode };

const BOLD = {
  pink: "#ff2d75",
  purple: "#6a2cff",
  orange: "#ff6b1a",
  teal: "#0fb5a8",
  yellow: "#ffd400",
  black: "#111111",
  lime: "#c8ff2d",
};

function Big({ children }: { children: ReactNode }) {
  return <p className="text-[clamp(3.5rem,18vw,8rem)] font-bold leading-[0.9] tracking-tight">{children}</p>;
}
function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-xs uppercase tracking-[0.3em] opacity-80">{children}</p>;
}
function Line({ children }: { children: ReactNode }) {
  return <p className="mt-4 text-2xl font-semibold leading-tight">{children}</p>;
}

function CustomSlide({ year, slot, initialLabel, initialValue, missing }: { year: number; slot: number; initialLabel: string; initialValue: string; missing: boolean }) {
  const [editing, setEditing] = useState(!initialValue);
  const [label, setLabel] = useState(initialLabel || (slot === 1 ? "inside joke of the year" : "song of the year"));
  const [value, setValue] = useState(initialValue);
  const [pending, start] = useTransition();

  if (missing) {
    return (
      <div>
        <Eyebrow>custom slide</Eyebrow>
        <Line>run supabase/migrations/20260920000004_wrapped.sql to unlock editable slides</Line>
      </div>
    );
  }

  if (!editing) {
    return (
      <div onClick={(e) => e.stopPropagation()}>
        <Eyebrow>{label}</Eyebrow>
        <Big>{value}</Big>
        <button type="button" onClick={() => setEditing(true)} className="mt-6 text-xs uppercase tracking-widest underline opacity-80">edit</button>
      </div>
    );
  }

  return (
    <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm space-y-3">
      <input value={label} onChange={(e) => setLabel(e.target.value)} className="w-full rounded-lg bg-white/15 px-3 py-2 text-xs uppercase tracking-widest text-current placeholder:text-current/50" placeholder="label" maxLength={60} />
      <textarea value={value} onChange={(e) => setValue(e.target.value)} rows={3} className="w-full rounded-lg bg-white/15 px-3 py-2 text-2xl font-bold text-current placeholder:text-current/50" placeholder="type it here" maxLength={300} />
      <button
        type="button"
        disabled={pending || !value.trim()}
        onClick={() => start(async () => { await saveWrappedCustom(year, slot, label, value); setEditing(false); })}
        className="rounded-full bg-white/90 px-5 py-2 font-bold text-black disabled:opacity-40"
      >
        {pending ? "saving…" : "save"}
      </button>
    </div>
  );
}

export function WrappedSlides({ stats }: { stats: WrappedStats }) {
  const [i, setI] = useState(0);
  const [a, b] = stats.authors;
  const tie = a && b && a.count === b.count;

  const slides: Slide[] = [
    {
      bg: BOLD.pink,
      content: (
        <div>
          <Eyebrow>relationship wrapped</Eyebrow>
          <Big>year {stats.year}</Big>
          <Line>{formatShortDate(stats.from)} → {formatShortDate(stats.to)}</Line>
          <p className="mt-10 text-xs uppercase tracking-[0.3em] opacity-70">tap to continue</p>
        </div>
      ),
    },
    {
      bg: BOLD.purple,
      content: (
        <div>
          <Eyebrow>you two made</Eyebrow>
          <Big>{stats.moments}</Big>
          <Line>moments, with {stats.photos} photos between them</Line>
        </div>
      ),
    },
    stats.topPlace
      ? {
          bg: BOLD.teal,
          content: (
            <div>
              <Eyebrow>your place</Eyebrow>
              <Big>{stats.topPlace.name}</Big>
              <Line>{stats.topPlace.count} moment{stats.topPlace.count === 1 ? "" : "s"} there. it&apos;s basically yours now.</Line>
            </div>
          ),
        }
      : null,
    stats.topTag
      ? {
          bg: BOLD.yellow,
          fg: "#111",
          content: (
            <div>
              <Eyebrow>your vibe</Eyebrow>
              <Big>#{stats.topTag.name}</Big>
              <Line>tagged {stats.topTag.count} times. no notes.</Line>
            </div>
          ),
        }
      : null,
    stats.topMood
      ? {
          bg: BOLD.black,
          content: (
            <div>
              <Eyebrow>the mood</Eyebrow>
              <Big><Icon name={iconFor(stats.topMood.name, "happy")} size={120} strokeWidth={1.2} /></Big>
              <Line>your most-used mood, {stats.topMood.count} times</Line>
            </div>
          ),
        }
      : null,
    a
      ? {
          bg: BOLD.orange,
          content: (
            <div>
              <Eyebrow>the historian award goes to</Eyebrow>
              <Big>{tie ? "both of you" : a.name}</Big>
              <Line>
                {tie
                  ? `${a.count} each. suspiciously balanced.`
                  : `${a.count} entries vs ${b?.count ?? 0}. ${b?.name ?? "the other one"}, we see you`}
              </Line>
            </div>
          ),
        }
      : null,
    stats.busiestMonth
      ? {
          bg: BOLD.lime,
          fg: "#111",
          content: (
            <div>
              <Eyebrow>busiest month</Eyebrow>
              <Big>{stats.busiestMonth.label.split(" ")[0]}</Big>
              <Line>{stats.busiestMonth.count} moments in {stats.busiestMonth.label}. hectic. iconic.</Line>
            </div>
          ),
        }
      : null,
    {
      bg: BOLD.pink,
      content:
        stats.milestones.length > 0 ? (
          <div className="w-full">
            <Eyebrow>the big ones</Eyebrow>
            <ul className="mt-4 space-y-3">
              {stats.milestones.map((m) => (
                <li key={m.id} className="flex items-center gap-3">
                  {m.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.url} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover ring-2 ring-white" />
                  ) : (
                    <span className="h-16 w-16 shrink-0 rounded-lg bg-white/20" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-xl font-bold leading-tight">{m.title || m.note || "a milestone"}</p>
                    <p className="text-[10px] uppercase tracking-widest opacity-80">{formatShortDate(m.date)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div>
            <Eyebrow>top moment</Eyebrow>
            <Big>no milestones yet</Big>
            <Line>flip the milestone toggle on the big ones and they&apos;ll land here.</Line>
          </div>
        ),
    },
    {
      bg: BOLD.purple,
      content: <CustomSlide year={stats.year} slot={1} initialLabel={stats.custom.find((c) => c.slot === 1)?.label ?? ""} initialValue={stats.custom.find((c) => c.slot === 1)?.value ?? ""} missing={stats.customTableMissing} />,
    },
    {
      bg: BOLD.teal,
      content: <CustomSlide year={stats.year} slot={2} initialLabel={stats.custom.find((c) => c.slot === 2)?.label ?? ""} initialValue={stats.custom.find((c) => c.slot === 2)?.value ?? ""} missing={stats.customTableMissing} />,
    },
    {
      bg: BOLD.black,
      content: (
        <div>
          <Eyebrow>that&apos;s year {stats.year}</Eyebrow>
          <Big><Icon name="heartFilled" size={120} /></Big>
          <Line>here&apos;s to the next one.</Line>
          <Link href="/wrapped" className="mt-8 inline-block rounded-full bg-white px-6 py-3 font-bold text-black">done</Link>
        </div>
      ),
    },
  ].filter(Boolean) as Slide[];

  const go = useCallback((d: number) => setI((x) => Math.min(slides.length - 1, Math.max(0, x + d))), [slides.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const s = slides[i];

  return (
    <div
      className="wrapped fixed inset-0 z-[45] flex flex-col text-white transition-colors duration-500"
      style={{ background: s.bg, color: s.fg ?? "#fff" }}
      onClick={(e) => {
        const x = e.clientX / window.innerWidth;
        go(x < 0.3 ? -1 : 1);
      }}
    >
      <div className="flex items-center gap-1 px-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        {slides.map((_, k) => (
          <span key={k} className="h-1 flex-1 rounded-full bg-current/25 overflow-hidden">
            <span className="block h-full bg-current transition-[width] duration-300" style={{ width: k < i ? "100%" : k === i ? "100%" : "0%" , opacity: k <= i ? 1 : 0 }} />
          </span>
        ))}
        <Link href="/wrapped" onClick={(e) => e.stopPropagation()} aria-label="Close" className="ml-2"><Icon name="close" size={20} /></Link>
      </div>

      <div key={i} className="wrapped-slide flex flex-1 items-center px-7 pb-16">
        <div className="w-full">{s.content}</div>
      </div>

      <p className="pb-[calc(1rem+env(safe-area-inset-bottom))] text-center text-[10px] uppercase tracking-[0.3em] opacity-60">
        {i + 1} / {slides.length}
      </p>
    </div>
  );
}
