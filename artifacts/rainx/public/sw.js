/* RainX Service Worker — Push Notifications + Offline Cache */
const CACHE_NAME = "rainx-v2026-07-30";
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

// ── Category → sound file mapping ─────────────────────────────────────────
// Place matching .mp3 files in /sounds/ in the public folder.
// Each category key matches the `category` field sent in the push payload.
// Only trading-specific categories get custom sounds.
// All other categories (community, payments, news, default, etc.) resolve to null,
// which lets the phone OS play its native default notification sound instead.
const CATEGORY_SOUNDS = {
  trading:    "/sounds/Trade%20Entry%20notification%20sound%20.mp3",
  tp:         "/sounds/take%20profit%20notification%20sound%20.mp3",
  sl:         "/sounds/Stop%20Loss%20notification%20sound%20.mp3",
  risk:       "/sounds/money%20received%20notification.mp3",
};

// ── Push Notification Handler ──────────────────────────────────────────────
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { title: "RainX", body: event.data?.text() || "" }; }

  const title    = data.title    || "RainX";
  const body     = data.body     || "";
  const icon     = data.icon     || "/icons/icon-192.png";
  const badge    = data.badge    || "/icons/icon-192.png";
  const tag      = data.tag      || "rainx-default";
  const url      = data.url      || "/";
  const vibrate  = data.vibrate  || [200, 100, 200];
  const category = data.category || "default";

  // Resolve the sound for this category; null = let the OS play its default sound
  const soundSrc = CATEGORY_SOUNDS[category] || null;

  // Category-specific options
  const options = {
    body,
    icon,
    badge,
    tag,
    vibrate,
    data: { url, soundSrc },
    requireInteraction: category === "trading" || category === "risk",
    actions: data.actions || [],
    silent: false,
  };

  // Show the notification; only post PLAY_SOUND if a custom sound is mapped
  event.waitUntil(
    self.registration.showNotification(title, options).then(() => {
      if (!soundSrc) return; // OS handles sound for this category
      return self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: "PLAY_SOUND", soundSrc });
        });
      });
    })
  );
});

// ── Notification Click ─────────────────────────────────────────────────────
// When the user taps a notification, focus or open the app and immediately
// send a PLAY_SOUND message so the correct category sound plays even if the
// app was fully closed when the notification arrived.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";
  const soundSrc  = event.notification.data?.soundSrc;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clients) => {
      // Focus existing RainX tab if open
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          if (soundSrc) client.postMessage({ type: "PLAY_SOUND", soundSrc });
          if (targetUrl !== "/") client.navigate(targetUrl);
          return;
        }
      }
      // Open new tab — sound will play via the PLAY_SOUND message listener once
      // the app hydrates and registers its service-worker message handler.
      if (self.clients.openWindow) {
        const newClient = await self.clients.openWindow(targetUrl);
        // Give the app ~1.5 s to register its message listener then play sound
        if (newClient && soundSrc) {
          await new Promise((r) => setTimeout(r, 1500));
          newClient.postMessage({ type: "PLAY_SOUND", soundSrc });
        }
      }
    })
  );
});

// ── Notification Close ─────────────────────────────────────────────────────
self.addEventListener("notificationclose", () => {});
