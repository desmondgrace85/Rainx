/* RainX Service Worker — Push Notifications + Offline Cache */
// IMPORTANT: bump this version string on every future deploy, or users may keep
// seeing a stale cached version of the app for a while after you ship changes.
const CACHE_NAME = "rainx-v2026-08-09-notifications";
const STATIC_ASSETS = ["/", "/index.html", "/manifest.json"];
const presenceByClient = new Map();
const recentPushIds = new Set();

// The page tells the worker whether RainX is visible and which conversation is
// open. This lets foreground messages stay inside the app instead of also
// becoming a phone notification.
self.addEventListener("message", (event) => {
  if (event.data?.type !== "RAINX_PRESENCE" || !event.source?.id) return;
  presenceByClient.set(event.source.id, {
    accountId: event.data.accountId || null,
    visible: event.data.visible === true,
    activeChatUserId: event.data.activeChatUserId || null,
  });
});

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

  // Pushes are sent as { title, body, data: { ...notificationData } }.
  // Accept flat payloads too so older senders continue to work.
  const notificationData = { ...(data.data || {}), ...data };
  const title    = notificationData.title    || "RainX";
  const body     = notificationData.body     || "";
  const icon     = notificationData.icon     || "/icons/icon-192.png";
  const badge    = notificationData.badge    || "/icons/icon-192.png";
  const tag      = notificationData.tag      || "rainx-default";
  const url      = notificationData.url      || "/";
  const vibrate  = notificationData.vibrate  || [200, 100, 200];
  const category = notificationData.category || "default";
  const kind     = notificationData.kind || "default";
  const pushId   = notificationData.messageId || notificationData.notificationId || notificationData.id;

  // A retried push must not ring or create another notification.
  if (pushId && recentPushIds.has(pushId)) return;
  if (pushId) recentPushIds.add(pushId);
  if (recentPushIds.size > 200) recentPushIds.delete(recentPushIds.values().next().value);

  const isSignal = kind === "signal" || ["trading", "tp", "sl", "risk", "news"].includes(category);

  // Resolve the sound for this category; null = let the OS play its default sound
  const soundSrc = CATEGORY_SOUNDS[category] || null;

  // Category-specific options
  const options = {
    body,
    icon,
    badge,
    tag,
    vibrate,
    data: { url, soundSrc, ...notificationData },
    requireInteraction: category === "trading" || category === "risk",
    actions: notificationData.actions || [],
    silent: false,
  };

  const showInApp = self.clients.matchAll({ type: "window", includeUncontrolled: true })
    .then((clients) => {
      const visibleClients = clients.filter((client) => {
        const presence = presenceByClient.get(client.id);
        return presence?.visible === true;
      });
      if (!visibleClients.length || isSignal) return false;
      visibleClients.forEach((client) => {
        client.postMessage({
          type: "RAINX_PUSH_RECEIVED",
          payload: { title, body, data: notificationData },
        });
      });
      return true;
    });

  // Show the notification; only post PLAY_SOUND if a custom sound is mapped
  event.waitUntil(
    showInApp.then((handledInApp) => {
      if (handledInApp) return;
      return self.registration.showNotification(title, options);
    }).then((shown) => {
      if (!shown) return;
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
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clients) => {
      // Focus existing RainX tab if open
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          if (targetUrl !== "/") client.navigate(targetUrl);
          return;
        }
      }
      // Open new tab — sound will play via the PLAY_SOUND message listener once
      // the app hydrates and registers its service-worker message handler.
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })
  );
});

// ── Notification Close ─────────────────────────────────────────────────────
self.addEventListener("notificationclose", () => {});
