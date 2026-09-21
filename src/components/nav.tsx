"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./icons";

const LEFT: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "home", icon: "home" },
  { href: "/timeline", label: "book", icon: "book" },
];
const RIGHT: { href: string; label: string; icon: IconName }[] = [
  { href: "/letters", label: "letters", icon: "envelope" },
  { href: "/map", label: "map", icon: "pin" },
  { href: "/wrapped", label: "wrapped", icon: "sparkle" },
];

function Tab({ href, label, icon, active }: { href: string; label: string; icon: IconName; active: boolean }) {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={`flex h-11 w-11 items-center justify-center rounded-full transition ${
        active ? "bg-bg-soft text-ink" : "text-muted hover:text-ink"
      }`}
    >
      <Icon name={icon} size={21} strokeWidth={active ? 1.9 : 1.5} />
    </Link>
  );
}

/** Floating pill: the whole app's navigation plus the big red "+" in the middle. */
export function Nav() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  if (pathname.startsWith("/wrapped/")) return null; // full-screen slides

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex justify-center px-4"
      style={{ paddingBottom: "calc(0.9rem + env(safe-area-inset-bottom))" }}
      aria-label="Main"
    >
      <div className="pill flex items-center gap-1 p-1.5">
        {LEFT.map((t) => <Tab key={t.href} {...t} active={isActive(t.href)} />)}
        <Link
          href="/new"
          aria-label="Add a moment"
          className="btn btn-primary mx-1 h-12 w-12 rounded-full p-0"
        >
          <Icon name="plus" size={24} strokeWidth={2} />
        </Link>
        {RIGHT.map((t) => <Tab key={t.href} {...t} active={isActive(t.href)} />)}
      </div>
    </nav>
  );
}
