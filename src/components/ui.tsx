import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { ViewTransition } from "react";
import { Icon, iconFor, type IconName } from "./icons";

export const PASTELS = ["var(--peach)", "var(--butter)", "var(--mint)", "var(--sky)", "var(--lilac)", "var(--pink)"];

/** Marker title with a highlighter swipe + tiny caption. */
export function PageHeader({
  title,
  caption,
  back,
  action,
  hl = "var(--butter)",
}: {
  title: ReactNode;
  caption?: ReactNode;
  back?: string;
  action?: ReactNode;
  hl?: string;
}) {
  return (
    <header className="relative pt-[calc(1.25rem+env(safe-area-inset-top))] pb-2" style={{ viewTransitionName: "page-header" }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {back && (
            <Link href={back} transitionTypes={["nav-back"]} aria-label="Back" className="label mb-3 inline-flex items-center gap-1 hover:text-ink">
              <Icon name="back" size={14} /> back
            </Link>
          )}
          <h1 className="font-marker text-[2.1rem] leading-[1.15] sm:text-[2.5rem]">
            <span className="hl" style={{ "--hl": hl } as CSSProperties}>{title}</span>
          </h1>
          {caption && <p className="label mt-2">{caption}</p>}
        </div>
        {action && <div className="shrink-0 pt-1">{action}</div>}
      </div>
    </header>
  );
}

/** Slide pages left/right on forward/back navigation. Wrap each page's content. */
export function Page({ children }: { children: ReactNode }) {
  return (
    <ViewTransition
      enter={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }}
      exit={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }}
      default="none"
    >
      {children}
    </ViewTransition>
  );
}

/** Thin hand-drawn line that draws itself in. Purely decorative. */
export function Squiggle({ className = "", flip = false, color = "var(--ink)" }: { className?: string; flip?: boolean; color?: string }) {
  return (
    <svg viewBox="0 0 320 60" className={`squiggle pointer-events-none ${className}`} style={{ transform: flip ? "scaleX(-1)" : undefined, color }} aria-hidden>
      <path d="M2 30c40-25 70 20 110 10s60-40 100-20 50 40 106 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Soft pastel doodles drifting in the background. */
export function Doodles() {
  const items: { icon: IconName; x: number; y: number; size: number; color: string; dur: number; delay: number; r: number; pulse?: boolean }[] = [
    { icon: "heart", x: 6, y: 12, size: 34, color: "var(--accent)", dur: 8, delay: 0, r: -12, pulse: true },
    { icon: "star", x: 88, y: 8, size: 28, color: "var(--butter)", dur: 9, delay: 1, r: 10 },
    { icon: "sparkle", x: 78, y: 32, size: 22, color: "var(--lilac)", dur: 7, delay: 2, r: 0, pulse: true },
    { icon: "cloud", x: 12, y: 46, size: 40, color: "var(--sky)", dur: 11, delay: 0.5, r: 4 },
    { icon: "flower", x: 90, y: 58, size: 30, color: "var(--mint)", dur: 10, delay: 3, r: -8 },
    { icon: "heart", x: 30, y: 80, size: 24, color: "var(--peach)", dur: 8.5, delay: 1.5, r: 14 },
    { icon: "moon", x: 70, y: 86, size: 30, color: "var(--lilac)", dur: 12, delay: 2.5, r: -6 },
    { icon: "rainbow", x: 4, y: 68, size: 36, color: "var(--pink)", dur: 9.5, delay: 0.8, r: 0 },
    { icon: "bunny", x: 48, y: 6, size: 26, color: "var(--pink)", dur: 10, delay: 1.2, r: 8 },
    { icon: "strawberry", x: 55, y: 72, size: 24, color: "var(--accent)", dur: 9, delay: 2.2, r: -10 },
    { icon: "sparkle", x: 22, y: 28, size: 16, color: "var(--butter)", dur: 6, delay: 0.4, r: 0, pulse: true },
  ];
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      {items.map((d, i) => (
        <span
          key={i}
          className="float absolute opacity-55 dark:opacity-40"
          style={{ left: `${d.x}%`, top: `${d.y}%`, color: d.color, "--dur": `${d.dur}s`, "--delay": `${d.delay}s`, "--r": `${d.r}deg` } as CSSProperties}
        >
          <span className={d.pulse ? "sparkle-pulse inline-flex" : "inline-flex"}>
            <Icon name={d.icon} size={d.size} strokeWidth={2.2} />
          </span>
        </span>
      ))}
      {/* Tiny twinkling dots for extra sparkle */}
      {[
        { x: 18, y: 22, delay: "0s" },
        { x: 72, y: 48, delay: "0.7s" },
        { x: 40, y: 64, delay: "1.3s" },
        { x: 92, y: 28, delay: "0.4s" },
        { x: 8, y: 88, delay: "1.8s" },
      ].map((t, i) => (
        <span
          key={`tw-${i}`}
          className="twinkle absolute h-1.5 w-1.5 rounded-full bg-accent"
          style={{ left: `${t.x}%`, top: `${t.y}%`, animationDelay: t.delay }}
        />
      ))}
    </div>
  );
}

/** A person's chosen doodle, from profiles.avatar_emoji (icon key or legacy emoji). */
export function Avatar({ value, size = 18, className = "" }: { value: string | null | undefined; size?: number; className?: string }) {
  return <Icon name={iconFor(value)} size={size} className={className} />;
}

export function EmptyNote({ icon = "camera", title, body }: { icon?: IconName; title: string; body?: string }) {
  return (
    <div className="mx-auto max-w-xs py-14 text-center animate-fade-up">
      <span className="sticker bob h-16 w-16 text-accent"><Icon name={icon} size={30} /></span>
      <p className="font-marker mt-4 text-2xl">{title}</p>
      {body && <p className="label mt-2">{body}</p>}
    </div>
  );
}
