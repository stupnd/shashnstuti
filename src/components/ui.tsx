import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { ViewTransition } from "react";
import { Icon, iconFor, type IconName } from "./icons";

/**
 * Four soft pastels, picked per item by hash. Calmer than the old six-way
 * lottery, but the grid should still look like a scrapbook, not a spreadsheet.
 */
export const PASTELS = ["var(--peach)", "var(--butter)", "var(--mint)", "var(--sky)"];

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

/**
 * A person's profile photo if they've set one, otherwise their chosen doodle
 * (profiles.avatar_emoji — an icon key, or a legacy emoji we map across).
 */
export function Avatar({
  value,
  url,
  size = 18,
  className = "",
}: {
  value: string | null | undefined;
  url?: string | null;
  size?: number;
  className?: string;
}) {
  if (url) {
    return (
      <Image
        src={url}
        alt=""
        width={size * 2}
        height={size * 2}
        className={`inline-block shrink-0 rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
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
