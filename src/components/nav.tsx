"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties } from "react";
import { Icon, type IconName } from "./icons";

const LEFT: { href: string; label: string; icon: IconName; color: string }[] = [
  { href: "/", label: "home", icon: "home", color: "var(--butter)" },
  { href: "/timeline", label: "book", icon: "book", color: "var(--mint)" },
];
const RIGHT: { href: string; label: string; icon: IconName; color: string }[] = [
  { href: "/letters", label: "letters", icon: "envelope", color: "var(--sky)" },
  { href: "/map", label: "map", icon: "pin", color: "var(--lilac)" },
  { href: "/wrapped", label: "wrapped", icon: "sparkle", color: "var(--peach)" },
];

function Tab({ href, label, icon, color, active }: { href: string; label: string; icon: IconName; color: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={`flex h-12 w-12 flex-col items-center justify-center gap-0.5 rounded-2xl transition-transform hover:-translate-y-0.5 hover:rotate-[-3deg] ${active ? "nav-active" : ""}`}
      style={{ background: active ? color : "transparent", color: active ? "var(--ink)" : "var(--muted)" } as CSSProperties}
    >
      <Icon name={icon} size={20} strokeWidth={active ? 2.2 : 1.7} />
      <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
    </Link>
  );
}

/** Floating sticker pill: navigation plus the big pink "+" in the middle. */
export function Nav() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  if (pathname.startsWith("/wrapped/") || pathname.startsWith("/watch") || pathname.startsWith("/flip")) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex justify-center px-4"
      style={{ paddingBottom: "calc(0.9rem + env(safe-area-inset-bottom))", viewTransitionName: "site-nav" }}
      aria-label="Main"
    >
      <div className="pill flex items-center gap-0.5 p-1.5">
        {LEFT.map((t) => <Tab key={t.href} {...t} active={isActive(t.href)} />)}
        <Link href="/new" transitionTypes={["nav-forward"]} aria-label="Add a moment" className="btn btn-primary wiggle mx-1 h-12 w-12 rounded-full p-0">
          <Icon name="plus" size={24} strokeWidth={2.4} />
        </Link>
        {RIGHT.map((t) => <Tab key={t.href} {...t} active={isActive(t.href)} />)}
      </div>
    </nav>
  );
}
