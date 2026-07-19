/* RainX Service Worker — Push Notifications + Offline Cache */
const CACHE_NAME = "rainx-v1";
const STATIC_ASSETS = ["/", "/index.html", "/manifest.json"];

// ── Install ────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS).catch(() => {}))
  );
});

// ── Activate ───────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Fetch (network-first for API, cache-first for assets) ──────────────────
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/api/")) return; // never cache API calls
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// ── Push Notification Handler ──────────────────────────────────────────────
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { title: "RainX", body: event.data?.text() || "" }; }

  const title   = data.title   || "RainX";
  const body    = data.body    || "";
  const icon    = data.icon    || "/icons/icon-192.png";
  const badge   = data.badge   || "/icons/icon-192.png";
  const tag     = data.tag     || "rainx-default";
  const url     = data.url     || "/";
  const vibrate = data.vibrate || [200, 100, 200];

  // Category-specific options
  const options = {
    body,
    icon,
    badge,
    tag,
    vibrate,
    data: { url },
    requireInteraction: data.category === "trading" || data.category === "risk",
    actions: data.actions || [],
    silent: data.silent || false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification Click ─────────────────────────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // Focus existing RainX tab if open
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          if (targetUrl !== "/") client.navigate(targetUrl);
          return;
        }
      }
      // Open new tab
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});

// ── Notification Close ─────────────────────────────────────────────────────
self.addEventListener("notificationclose", () => {});
