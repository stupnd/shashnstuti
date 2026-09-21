"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // Register in all envs so letter notification clicks can route while testing.
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
