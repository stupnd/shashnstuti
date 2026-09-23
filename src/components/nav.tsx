"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type CSSProperties } from "react";
import { Icon, iconFor, type IconName } from "./icons";

/**
 * Five tabs around the create button. Map and wrapped used to sit here despite
 * having no other entry point in the app and being the two least-opened
 * screens; they now live inside the book. Settings took one of the slots
 * because it holds notifications, and it was previously reachable only by
 * tapping your own name on the home page.
 */
const LEFT: { href: string; label: string; icon: IconName; color: string }[] = [
  { href: "/", label: "home", icon: "home", color: "var(--butter)" },
  { href: "/timeline", label: "book", icon: "book", color: "var(--mint)" },
  { href: "/planner", label: "ideas", icon: "bulb", color: "var(--pink)" },
];

type Tab = { href: string; label: string; icon: IconName; color: string; badge?: number; photo?: string | null };

/** Things you can make. The "+" used to go straight to /new (moments only). */
const CREATE: { href: string; label: string; hint: string; icon: IconName; color: string }[] = [
  { href: "/new", label: "a moment", hint: "photos from today", icon: "camera", color: "var(--mint)" },
  { href: "/booth", label: "a photo strip", hint: "four shots in the booth", icon: "star", color: "var(--pink)" },
  { href: "/planner", label: "an idea", hint: "a place, a present", icon: "bulb", color: "var(--butter)" },
  { href: "/letters/new", label: "a letter", hint: "open when…", icon: "envelope", color: "var(--lilac)" },
];

function TabLink({
  href, label, icon, color, active, badge, photo,
}: Tab & { active: boolean }) {
  // An open tab has by definition just been read.
  const hasBadge = !active && (badge ?? 0) > 0;
  return (
    <Link
      href={href}
      aria-label={hasBadge ? `${label}, ${badge} new` : label}
      aria-current={active ? "page" : undefined}
      className={`relative flex h-12 w-11 flex-col items-center justify-center gap-0.5 rounded-2xl ${active ? "nav-active" : ""}`}
      style={{ background: active ? color : "transparent", color: active ? "var(--ink)" : "var(--muted)" } as CSSProperties}
    >
      {photo ? (
        <Image
          src={photo}
          alt=""
          width={40}
          height={40}
          className={`h-5 w-5 rounded-full object-cover ${active ? "ring-2 ring-ink" : ""}`}
        />
      ) : (
        <Icon name={icon} size={20} strokeWidth={active ? 2.2 : 1.7} />
      )}
      <span className="text-[8.5px] font-bold uppercase leading-none tracking-tight">{label}</span>
      {hasBadge && (
        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-ink bg-accent px-1 text-[9px] font-bold leading-none text-white">
          {badge! > 9 ? "9+" : badge}
        </span>
      )}
    </Link>
  );
}

export function Nav({
  unread,
  avatar,
  avatarUrl,
  name,
}: {
  /** What's arrived from the other person since you last looked. */
  unread?: { messages: number; book: number };
  /** The signed-in person's doodle, used when they haven't set a photo. */
  avatar?: string | null;
  /** Their profile photo, if they've picked one. */
  avatarUrl?: string | null;
  /** Shown on the tab so it's obvious who you're signed in as. */
  name?: string;
}) {
  const pathname = usePathname();
  const [creating, setCreating] = useState(false);

  // Any navigation closes the sheet. Adjusted during render rather than in an
  // effect so it lands in the same pass as the route change.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setCreating(false);
  }

  const RIGHT: Tab[] = [
    { href: "/planner/calendar", label: "dates", icon: "calendar", color: "var(--sky)" },
    { href: "/messages", label: "notes", icon: "chat", color: "var(--lilac)", badge: unread?.messages },
    { href: "/settings", label: name ?? "you", icon: iconFor(avatar, "gear"), color: "var(--peach)", photo: avatarUrl ?? null },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    // "ideas" is /planner exactly; the calendar is its own tab underneath it.
    if (href === "/planner") return pathname === "/planner";
    return pathname.startsWith(href);
  };

  if (
    pathname.startsWith("/wrapped/") ||
    pathname.startsWith("/watch") ||
    pathname.startsWith("/flip") ||
    pathname.startsWith("/booth") ||
    (pathname.startsWith("/play/") && pathname !== "/play")
  ) {
    return null;
  }

  return (
    <>
      {creating && (
        <button
          type="button"
          aria-label="Close"
          onClick={() => setCreating(false)}
          className="fixed inset-0 z-30 bg-ink/20"
        />
      )}

      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex flex-col items-center px-2 sm:px-4"
        style={{ paddingBottom: "calc(0.9rem + env(safe-area-inset-bottom))", viewTransitionName: "site-nav" }}
        aria-label="Main"
      >
        {creating && (
          <div className="animate-fade-up mb-2 w-full max-w-xs space-y-1.5" role="menu">
            {CREATE.map((c) => (
              <Link
                key={c.href}
                href={c.href}
                transitionTypes={["nav-forward"]}
                role="menuitem"
                className="card flex items-center gap-3 p-3"
                style={{ ["--card-shadow" as string]: c.color }}
              >
                <span className="sticker h-10 w-10 shrink-0" style={{ background: c.color }}>
                  <Icon name={c.icon} size={18} strokeWidth={2} />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold leading-tight">{c.label}</span>
                  <span className="label">{c.hint}</span>
                </span>
              </Link>
            ))}
          </div>
        )}

        <div className="pill flex items-center gap-0.5 p-1.5">
          {LEFT.map((t) => (
            <TabLink
              key={t.href}
              {...t}
              active={isActive(t.href)}
              badge={t.href === "/timeline" ? unread?.book : undefined}
            />
          ))}

          <button
            type="button"
            onClick={() => setCreating((c) => !c)}
            aria-expanded={creating}
            aria-haspopup="menu"
            aria-label={creating ? "Close the add menu" : "Add something"}
            className="btn btn-primary mx-0.5 h-12 w-12 shrink-0 rounded-full p-0"
          >
            <Icon name={creating ? "close" : "plus"} size={creating ? 20 : 24} strokeWidth={2.4} />
          </button>

          {RIGHT.map((t) => <TabLink key={t.href} {...t} active={isActive(t.href)} />)}
        </div>
      </nav>
    </>
  );
}
