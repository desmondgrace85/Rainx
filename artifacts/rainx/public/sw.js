/* RainX Service Worker — Push Notifications + Offline Cache */
// IMPORTANT: bump this version string on every future deploy, or users may keep
// seeing a stale cached version of the app for a while after you ship changes.
const CACHE_NAME = "rainx-v2026-08-16-appearance-fix-1";
const STATIC_ASSETS = ["/", "/index.html", "/manifest.json"];
const presenceByClient = new Map();
const recentPushIds = new Set();
const PUSH_DB_NAME = "rainx-notification-state";
const PUSH_STORE_NAME = "delivered-pushes";

function openPushStateDb() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in self)) {
      reject(new Error("IndexedDB is unavailable"));
      return;
    }
    const request = indexedDB.open(PUSH_DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(PUSH_STORE_NAME, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open push state"));
  });
}

function idbRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB request failed"));
  });
}

async function claimPushId(pushId) {
  if (!pushId) return true;
  if (recentPushIds.has(pushId)) return false;
  try {
    const db = await openPushStateDb();
    const transaction = db.transaction(PUSH_STORE_NAME, "readwrite");
    transaction.objectStore(PUSH_STORE_NAME).add({ id: String(pushId), claimedAt: Date.now() });
    await new Promise((resolve, reject) => {
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error || new Error("Could not claim push"));
      transaction.onabort = () => reject(transaction.error || new Error("Push claim aborted"));
    });

    // Keep the persistent dedupe set bounded while retaining enough history to
    // cover refreshes and service-worker restarts.
    const all = await idbRequest(db.transaction(PUSH_STORE_NAME, "readonly")
      .objectStore(PUSH_STORE_NAME)
      .getAll());
    if (all.length > 500) {
      const staleIds = all
        .sort((a, b) => a.claimedAt - b.claimedAt)
        .slice(0, all.length - 500)
        .map((item) => item.id);
      const cleanup = db.transaction(PUSH_STORE_NAME, "readwrite");
      staleIds.forEach((id) => cleanup.objectStore(PUSH_STORE_NAME).delete(id));
    }
    recentPushIds.add(pushId);
    return true;
  } catch (error) {
    if (error?.name === "ConstraintError") return false;
    // The in-memory set still prevents duplicate delivery during this worker's
    // lifetime if IndexedDB is unavailable.
    recentPushIds.add(pushId);
    return true;
  }
}

// The page tells the worker whether RainX is visible and which conversation is
// open. This lets foreground messages stay inside the app instead of also
// becoming a phone notification.
self.addEventListener("message", (event) => {
  if (event.data?.type !== "RAINX_PRESENCE" || !event.source?.id) return;
  presenceByClient.set(event.source.id, {
    accountId: event.data.accountId || null,
    visible: event.data.visible === true,
    activeChatUserId: event.data.activeChatUserId || null,
    updatedAt: Date.now(),
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
  // Prefer the nested push data object for routing metadata. The outer payload
  // is only the transport envelope; keeping these fields explicit prevents a
  // generic/default category from overwriting a community or signal category.
  const pushData = data.data && typeof data.data === "object" ? data.data : {};
  const title    = data.title || pushData.title || "RainX";
  const body     = data.body || pushData.body || "";
  const icon     = notificationData.icon     || "/icons/icon-192.png";
  const badge    = notificationData.badge    || "/icons/icon-192.png";
  const url      = notificationData.url      || "/";
  const vibrate  = notificationData.vibrate  || [200, 100, 200];
  const category = pushData.category || notificationData.category || "default";
  const kind     = pushData.kind || notificationData.kind || "default";
  const pushId   = pushData.notificationId || pushData.messageId || notificationData.notificationId || notificationData.messageId || notificationData.id;
  const tag      = notificationData.tag
    || (kind === "chat"
      ? "rainx-message"
      : kind === "signal" || ["trading", "tp", "sl"].includes(category)
        ? "rainx-signal"
        : kind === "community" || category === "community"
          ? "rainx-community"
          : `rainx-${category || "default"}`);

  // Resolve the sound for this category; null = let the OS play its default sound
  const soundSrc = CATEGORY_SOUNDS[category] || null;

  // Category-specific options
  const chatActions = kind === "chat"
    ? [
        { action: "reply", title: "Reply" },
        { action: "mark-read", title: "Mark read" },
      ]
    : [];
  const options = {
    body,
    icon,
    badge,
    tag,
    vibrate,
    data: { url, soundSrc, ...notificationData },
    requireInteraction: category === "trading" || category === "risk",
    actions: notificationData.actions || chatActions,
    renotify: true,
    silent: false,
  };

  const showInApp = self.clients.matchAll({ type: "window", includeUncontrolled: true })
    .then((clients) => {
      const visibleClients = clients.filter((client) => {
        const presence = presenceByClient.get(client.id);
        const hasFreshPresence = presence && Date.now() - presence.updatedAt < 20_000;
        const isVisibleWindow = client.visibilityState ? client.visibilityState === "visible" : true;
        return hasFreshPresence && presence.visible === true && isVisibleWindow && (
          !notificationData.accountId || presence.accountId === notificationData.accountId
        );
      });
      // One visible RainX window owns the in-app banner. Posting to every
      // window would duplicate the same event across tabs.
      if (!visibleClients.length) return false;
      visibleClients[0].postMessage({
        type: "RAINX_PUSH_RECEIVED",
        payload: { title, body, data: notificationData },
      });
      return true;
    });

  // Claim before routing so the same push cannot be delivered again after a
  // service-worker restart, whether it was handled in-app or in the OS.
  event.waitUntil(
    claimPushId(pushId).then((claimed) => {
      if (!claimed) return false;
      return showInApp;
    }).then((handledInApp) => {
      if (handledInApp === false) return false;
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
  const data = event.notification.data || {};
  const action = event.action || "open";
  const targetUrl = data.url || "/";
  const actionUrl = `${targetUrl}${targetUrl.includes("?") ? "&" : "?"}notificationAction=${encodeURIComponent(action)}`;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clients) => {
      if (action === "mark-read") {
        const client = clients.find((item) => item.url.includes(self.location.origin));
        if (client) {
          client.focus();
          client.postMessage({ type: "RAINX_NOTIFICATION_ACTION", payload: { ...data, action } });
          return;
        }
      }
      // Focus existing RainX tab if open
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          if (actionUrl !== "/") client.navigate(actionUrl);
          return;
        }
      }
      // Open new tab — sound will play via the PLAY_SOUND message listener once
      // the app hydrates and registers its service-worker message handler.
      if (self.clients.openWindow) {
        await self.clients.openWindow(actionUrl);
      }
    })
  );
});

// ── Notification Close ─────────────────────────────────────────────────────
self.addEventListener("notificationclose", () => {});
