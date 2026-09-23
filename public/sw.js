/* Makes the app installable, caches shell static assets, and handles
   Web Push + notification taps. Pages/photos always hit the network. */
const CACHE = "us-static-v2";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  const isStatic =
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/"));
  if (!isStatic || e.request.method !== "GET") return;

  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(e.request);
      if (hit) return hit;
      const res = await fetch(e.request);
      if (res.ok) cache.put(e.request, res.clone());
      return res;
    }),
  );
});

self.addEventListener("push", (e) => {
  let data = { title: "our scrapbook", body: "something new for you", url: "/", tag: "scrapbook" };
  try {
    if (e.data) data = { ...data, ...e.data.json() };
  } catch {
    try {
      const text = e.data && e.data.text();
      if (text) data.body = text;
    } catch {
      /* ignore */
    }
  }

  e.waitUntil(
    self.registration.showNotification(data.title || "our scrapbook", {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.tag || "scrapbook",
      data: { url: data.url || "/" },
      renotify: true,
    }),
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          if (client.url.includes(self.location.origin) && "navigate" in client) {
            return client.navigate(target).then((c) => (c && c.focus ? c.focus() : client.focus()));
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    }),
  );
});
