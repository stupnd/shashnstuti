"use client";

import { useEffect, useRef } from "react";

const SEEN_KEY = "scrapbook-letter-seen";
const PREF_KEY = "scrapbook-letter-notifs";

export type UnopenedLetterHint = { id: string; title: string };

function readSeen(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    return new Set(Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

function writeSeen(ids: Set<string>) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...ids]));
  } catch {
    /* ignore */
  }
}

function notifsEnabled(): boolean {
  try {
    const pref = localStorage.getItem(PREF_KEY);
    if (pref === "off") return false;
    if (pref === "on") return true;
  } catch {
    /* ignore */
  }
  return typeof Notification !== "undefined" && Notification.permission === "granted";
}

async function showLetterNotification(letter: UnopenedLetterHint) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (!notifsEnabled() || Notification.permission !== "granted") return;

  const title = "you've got mail ♡";
  const body = letter.title || "a sealed letter is waiting";
  const opts: NotificationOptions = {
    body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: `letter-${letter.id}`,
    data: { url: "/letters" },
  };

  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg?.showNotification) {
      await reg.showNotification(title, opts);
      return;
    }
  } catch {
    /* fall through */
  }
  try {
    new Notification(title, opts);
  } catch {
    /* ignore */
  }
}

async function syncAppBadge(count: number) {
  try {
    if (count > 0) await navigator.setAppBadge?.(count);
    else await navigator.clearAppBadge?.();
  } catch {
    /* ignore */
  }
}

/**
 * Keeps the home-screen app badge in sync and fires a browser notification
 * the first time we see each unopened letter (when permission is on).
 */
export function LetterAlerts({ letters }: { letters: UnopenedLetterHint[] }) {
  const fired = useRef(false);

  useEffect(() => {
    syncAppBadge(letters.length);

    if (fired.current) return;
    fired.current = true;

    if (letters.length === 0) return;
    if (!notifsEnabled()) return;
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;

    const seen = readSeen();
    const fresh = letters.filter((l) => !seen.has(l.id));
    if (fresh.length === 0) return;

    // One toast for a single letter; a summary if several piled up.
    if (fresh.length === 1) {
      void showLetterNotification(fresh[0]!);
    } else {
      void showLetterNotification({
        id: fresh.map((l) => l.id).join(","),
        title: `${fresh.length} sealed letters are waiting`,
      });
    }

    for (const l of fresh) seen.add(l.id);
    writeSeen(seen);
  }, [letters]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") syncAppBadge(letters.length);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [letters]);

  return null;
}

export { PREF_KEY as LETTER_NOTIF_PREF_KEY };
