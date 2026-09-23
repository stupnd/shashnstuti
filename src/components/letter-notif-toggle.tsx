"use client";

import { useEffect, useState } from "react";
import { Icon } from "./icons";
import { LETTER_NOTIF_PREF_KEY } from "./letter-alerts";

type Status = "unsupported" | "denied" | "off" | "on" | "default";

function readStatus(): Status {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  try {
    const pref = localStorage.getItem(LETTER_NOTIF_PREF_KEY);
    if (pref === "off") return "off";
    if (pref === "on" && Notification.permission === "granted") return "on";
  } catch {
    /* ignore */
  }
  if (Notification.permission === "granted") return "on";
  return "default";
}

/** Opt in/out of browser pings when a sealed letter is waiting. */
export function LetterNotifToggle() {
  const [status, setStatus] = useState<Status>("default");

  useEffect(() => {
    setStatus(readStatus());
  }, []);

  async function enable() {
    if (!("Notification" in window)) return;
    const perm = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    if (perm !== "granted") {
      setStatus(perm === "denied" ? "denied" : "default");
      return;
    }
    try {
      localStorage.setItem(LETTER_NOTIF_PREF_KEY, "on");
    } catch {
      /* ignore */
    }
    setStatus("on");
  }

  function disable() {
    try {
      localStorage.setItem(LETTER_NOTIF_PREF_KEY, "off");
    } catch {
      /* ignore */
    }
    setStatus("off");
  }

  if (status === "unsupported") {
    return <p className="text-sm text-muted">this browser can’t do letter pings.</p>;
  }

  if (status === "denied") {
    return (
      <p className="text-sm text-muted">
        notifications are blocked in the browser — allow them for this site to get letter pings.
      </p>
    );
  }

  const on = status === "on";

  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="font-semibold tracking-tight text-xl leading-tight">letter pings</p>
        <p className="mt-1 text-sm text-muted">
          {on ? "we’ll nudge you when a sealed letter is waiting." : "turn on to get a ping for unopened letters."}
        </p>
      </div>
      <button
        type="button"
        onClick={() => (on ? disable() : void enable())}
        className={`btn h-11 gap-2 rounded-full px-4 ${on ? "btn-mint" : "btn-soft"}`}
        aria-pressed={on}
      >
        <Icon name={on ? "check" : "envelope"} size={18} strokeWidth={2} />
        {on ? "on" : "off"}
      </button>
    </div>
  );
}
