"use client";

import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { Icon } from "@/components/icons";
import { parseSpotifyEmbed } from "@/lib/spotify";

/**
 * Floating music button. Opens a compact Spotify embed so you can play
 * your shared playlist while flipping through the scrapbook.
 *
 * Note: browsers block autoplay — you still tap play once inside the embed.
 * Full tracks need a Spotify account (Premium for some devices).
 */
export function SpotifyPlayer({ url }: { url: string | null }) {
  const pathname = usePathname();
  const parsed = parseSpotifyEmbed(url);
  const panelId = useId();
  const [open, setOpen] = useState(false);

  const hide =
    pathname.startsWith("/wrapped/") ||
    pathname.startsWith("/watch") ||
    pathname.startsWith("/flip") ||
    (pathname.startsWith("/play/") && pathname !== "/play");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!parsed || hide) return null;

  return (
    <div
      className="fixed z-40"
      style={{
        right: "max(1rem, env(safe-area-inset-right))",
        bottom: "calc(5.5rem + env(safe-area-inset-bottom))",
      }}
    >
      {open && (
        <div
          id={panelId}
          className="card mb-3 w-[min(22rem,calc(100vw-2rem))] overflow-hidden p-2 animate-fade-up"
          style={{ ["--card-shadow" as string]: "var(--mint)" }}
          role="dialog"
          aria-label="Our playlist"
        >
          <div className="mb-2 flex items-center justify-between gap-2 px-1">
            <p className="label">our soundtrack</p>
            <div className="flex items-center gap-1">
              <a
                href={parsed.openUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost h-8 px-2 text-xs"
              >
                open in spotify
              </a>
              <button type="button" className="btn btn-ghost h-8 w-8 rounded-full p-0" aria-label="Close player" onClick={() => setOpen(false)}>
                <Icon name="close" size={16} />
              </button>
            </div>
          </div>
          <iframe
            title="Spotify player"
            src={parsed.embedUrl}
            width="100%"
            height="152"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className="rounded-xl border-0"
          />
          <p className="mt-2 px-1 text-[11px] text-muted">tap play in the widget — browsers won&apos;t start music by themselves.</p>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Hide playlist" : "Play our playlist"}
        className={`sticker bob ml-auto flex h-12 w-12 items-center justify-center ${open ? "bg-mint text-ink" : "bg-accent text-white"}`}
        style={{ boxShadow: "3px 3px 0 var(--ink)" }}
      >
        <Icon name="music" size={22} strokeWidth={2.2} />
      </button>
    </div>
  );
}
