import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, iconFor, type IconName } from "./icons";

/** Script title + tiny spaced caption, like the cover page. */
export function PageHeader({
  title,
  caption,
  back,
  action,
  align = "left",
}: {
  title: ReactNode;
  caption?: ReactNode;
  back?: string;
  action?: ReactNode;
  align?: "left" | "center";
}) {
  return (
    <header className={`relative pt-[calc(1.25rem+env(safe-area-inset-top))] pb-2 ${align === "center" ? "text-center" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className={`min-w-0 ${align === "center" ? "mx-auto" : ""}`}>
          {back && (
            <Link href={back} aria-label="Back" className="label mb-3 inline-flex items-center gap-1 hover:text-ink">
              <Icon name="back" size={14} /> back
            </Link>
          )}
          <h1 className="font-script text-[1.9rem] leading-[1.5] text-ink sm:text-[2.2rem]">{title}</h1>
          {caption && <p className="label mt-1">{caption}</p>}
        </div>
        {action && <div className="shrink-0 pt-1">{action}</div>}
      </div>
    </header>
  );
}

/** Thin hand-drawn line that draws itself in. Purely decorative. */
export function Squiggle({ className = "", flip = false }: { className?: string; flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 320 60"
      className={`squiggle pointer-events-none text-line ${className}`}
      style={flip ? { transform: "scaleX(-1)" } : undefined}
      aria-hidden
    >
      <path
        d="M2 30c40-25 70 20 110 10s60-40 100-20 50 40 106 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** A person's chosen doodle, from profiles.avatar_emoji (icon key or legacy emoji). */
export function Avatar({ value, size = 18, className = "" }: { value: string | null | undefined; size?: number; className?: string }) {
  return <Icon name={iconFor(value)} size={size} className={className} />;
}

export function EmptyNote({ icon = "camera", title, body }: { icon?: IconName; title: string; body?: string }) {
  return (
    <div className="mx-auto max-w-xs py-14 text-center">
      <Icon name={icon} size={36} className="text-muted" strokeWidth={1.3} />
      <p className="font-script mt-4 text-lg leading-relaxed">{title}</p>
      {body && <p className="label mt-2">{body}</p>}
    </div>
  );
}
