"use client";

import { useEffect, useState } from "react";
import { deletePushSubscription, fetchVapidPublicKey, savePushSubscription } from "@/lib/actions/push";
import { Icon } from "./icons";

const PREF_KEY = "scrapbook-push-notifs";

type Status = "unsupported" | "denied" | "need-keys" | "off" | "on" | "default" | "busy";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function currentSubscription() {
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

/**
 * Turn on Web Push for the home-screen app — thoughts, letters, and new moments.
 * Needs iOS 16.4+ (Add to Home Screen) or a modern desktop/Android browser.
 */
export function PushNotifToggle() {
  const [status, setStatus] = useState<Status>("default");
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      if (typeof window === "undefined") return;
      if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatus("unsupported");
        return;
      }
      const vapid = await fetchVapidPublicKey();
      if (!vapid) {
        setStatus("need-keys");
        return;
      }
      if (Notification.permission === "denied") {
        setStatus("denied");
        return;
      }
      try {
        const pref = localStorage.getItem(PREF_KEY);
        const sub = await currentSubscription();
        if (pref === "off") {
          setStatus("off");
          return;
        }
        if (Notification.permission === "granted" && sub) {
          setStatus("on");
          return;
        }
      } catch {
        /* ignore */
      }
      setStatus(Notification.permission === "granted" ? "off" : "default");
    })();
  }, []);

  async function enable() {
    setHint(null);
    setStatus("busy");
    try {
      const vapid = await fetchVapidPublicKey();
      if (!vapid) {
        setStatus("need-keys");
        return;
      }
      const perm = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
      if (perm !== "granted") {
        setStatus(perm === "denied" ? "denied" : "default");
        return;
      }

      await navigator.serviceWorker.register("/sw.js");
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapid),
        });
      }
      const json = sub.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        setHint("couldn’t create a push subscription");
        setStatus("default");
        return;
      }
      const res = await savePushSubscription({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      });
      if ("error" in res) {
        setHint(res.error);
        setStatus("default");
        return;
      }
      try {
        localStorage.setItem(PREF_KEY, "on");
        // Keep legacy letter pref in sync so LetterAlerts still works when open.
        localStorage.setItem("scrapbook-letter-notifs", "on");
      } catch {
        /* ignore */
      }
      setStatus("on");
    } catch (err) {
      setHint(err instanceof Error ? err.message : "couldn’t enable notifications");
      setStatus("default");
    }
  }

  async function disable() {
    setHint(null);
    setStatus("busy");
    try {
      const sub = await currentSubscription();
      if (sub) {
        await deletePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      try {
        localStorage.setItem(PREF_KEY, "off");
        localStorage.setItem("scrapbook-letter-notifs", "off");
      } catch {
        /* ignore */
      }
      setStatus("off");
    } catch {
      setStatus("off");
    }
  }

  if (status === "unsupported") {
    return (
      <p className="text-sm text-muted">
        this device can’t do push yet — on iPhone use Safari → Share → Add to Home Screen (iOS 16.4+).
      </p>
    );
  }

  if (status === "need-keys") {
    return (
      <p className="text-sm text-muted">
        push isn’t configured on the server yet — add VAPID keys to the env (see README).
      </p>
    );
  }

  if (status === "denied") {
    return (
      <p className="text-sm text-muted">
        notifications are blocked — allow them for this site in system / browser settings.
      </p>
    );
  }

  const on = status === "on";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-marker text-xl leading-tight">push pings</p>
          <p className="mt-1 text-sm text-muted">
            {on
              ? "we’ll nudge you for thoughts, letters, and new moments."
              : "turn on so the other phone pings you even when the app is closed."}
          </p>
        </div>
        <button
          type="button"
          disabled={status === "busy"}
          onClick={() => (on ? void disable() : void enable())}
          className={`btn h-11 gap-2 rounded-full px-4 ${on ? "btn-mint" : "btn-soft"}`}
          aria-pressed={on}
        >
          <Icon name={on ? "check" : "sparkle"} size={18} strokeWidth={2} />
          {status === "busy" ? "…" : on ? "on" : "off"}
        </button>
      </div>
      {hint && (
        <p className="text-sm text-accent" role="alert">
          {hint}
        </p>
      )}
    </div>
  );
}
