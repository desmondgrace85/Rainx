/**
 * Native (Capacitor) push — Android/iOS via FCM.
 * Web is a no-op. Do not rely on browser Web Push for the app builds.
 */
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { PushNotifications, type Token } from "@capacitor/push-notifications";
import { supabase } from "./supabaseClient";

const TOKEN_KEY = "rainx-native-push-token";
const TRANSPORT_KEY = "rainx-push-transport";
const APP_ID = "com.rainx.app";

/**
 * Absolute API origin for native builds.
 * Relative `/api/...` fails in the Capacitor WebView (local origin), so
 * registration never reached Railway and registeredTokens stayed 0.
 */
const API_BASE = "https://rainx-webapp.vercel.app";

function getPlatform(): "android" | "ios" | null {
  const p = Capacitor.getPlatform();
  return p === "android" || p === "ios" ? p : null;
}

async function clearLegacyBrowserPush() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      regs.map(async (r) => {
        try {
          const sub = await r.pushManager?.getSubscription?.();
          if (sub) await sub.unsubscribe().catch(() => {});
        } catch {
          /* ignore */
        }
        await r.unregister().catch(() => {});
      }),
    );
  } catch (e) {
    console.warn("[RainX] legacy web push cleanup failed", e);
  }
}

/** Pending FCM token if it arrived before Supabase session was ready. */
let pendingToken: Token | null = null;

async function registerNativeToken(token: Token) {
  const platform = getPlatform();
  if (!platform || !token?.value) return;

  const { data } = await supabase.auth.getSession();
  const session = data.session;

  if (!session?.user?.id || !session.access_token) {
    // Token can arrive before login — keep it and register after auth.
    pendingToken = token;
    console.warn("[RainX] FCM token received before authenticated session — will retry after login");
    return;
  }

  pendingToken = null;
  localStorage.setItem(TOKEN_KEY, token.value);
  localStorage.setItem(TRANSPORT_KEY, "native");

  const r = await fetch(`${API_BASE}/api/push/native/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      platform,
      token: token.value,
      appId: APP_ID,
      deviceName: navigator.userAgent.slice(0, 240),
      appVersion: "1.0.0",
    }),
  });

  if (!r.ok) {
    const detail = await r.text().catch(() => "");
    throw new Error(`FCM registration failed: ${r.status} ${detail}`);
  }

  console.info("[RainX] native FCM token registered");
}

async function requestNativePermissionAndRegister() {
  const perms = await PushNotifications.checkPermissions();
  let receive = perms.receive;

  if (receive === "prompt" || receive === "prompt-with-rationale") {
    receive = (await PushNotifications.requestPermissions()).receive;
  }

  if (receive !== "granted") {
    console.warn("[RainX] native notification permission:", receive);
    return;
  }

  // Must match AndroidConfig.channel_id on the server (rainx_default).
  if (Capacitor.getPlatform() === "android") {
    await PushNotifications.createChannel({
      id: "rainx_default",
      name: "RainX notifications",
      description: "Messages, Community activity and Raina AI alerts",
      importance: 5,
      visibility: 1,
      sound: "default",
      vibration: true,
    });
  }

  await PushNotifications.register();

  // If we already had a token from a previous session, re-post after login.
  const cached = localStorage.getItem(TOKEN_KEY);
  if (cached) {
    try {
      await registerNativeToken({ value: cached } as Token);
    } catch (e) {
      console.warn("[RainX] cached FCM token re-register failed", e);
    }
  }
}

/**
 * Call once at app startup (main.tsx). Safe on web — returns a no-op cleanup.
 */
export async function initNativeNotifications(): Promise<() => Promise<void>> {
  if (!Capacitor.isNativePlatform()) {
    return async () => {};
  }

  localStorage.setItem(TRANSPORT_KEY, "native");
  await clearLegacyBrowserPush();

  const listeners = await Promise.all([
    App.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack && window.history.length > 1) window.history.back();
      else void App.exitApp();
    }),

    App.addListener("appUrlOpen", ({ url }) => {
      try {
        const u = new URL(url);
        window.history.replaceState({}, "", `${u.pathname}${u.search}${u.hash}` || "/");
        window.dispatchEvent(new PopStateEvent("popstate"));
      } catch {
        /* ignore */
      }
    }),

    PushNotifications.addListener("registration", async (token) => {
      try {
        await registerNativeToken(token);
      } catch (e) {
        console.error("[RainX] FCM registration failed", e);
      }
    }),

    PushNotifications.addListener("registrationError", (e) => {
      console.error("[RainX] FCM registrationError", e);
    }),

    // Foreground delivery — OS may still show a system notification depending on platform.
    PushNotifications.addListener("pushNotificationReceived", (notification) => {
      window.dispatchEvent(
        new CustomEvent("rainx:native-push-received", { detail: notification }),
      );
    }),

    PushNotifications.addListener("pushNotificationActionPerformed", (event) => {
      const data = event.notification?.data || {};
      const target = data.url
        ? String(data.url)
        : data.postId
          ? `/?rainxTarget=post&postId=${encodeURIComponent(String(data.postId))}`
          : "/";

      window.dispatchEvent(
        new CustomEvent("rainx:native-push-open", { detail: { ...data, url: target } }),
      );

      try {
        const u = new URL(target, window.location.origin);
        window.history.replaceState({}, "", `${u.pathname}${u.search}${u.hash}`);
        window.dispatchEvent(new PopStateEvent("popstate"));
      } catch {
        /* ignore */
      }
    }),
  ]);

  const register = async () => {
    try {
      await requestNativePermissionAndRegister();
      if (pendingToken) {
        await registerNativeToken(pendingToken);
      }
    } catch (e) {
      console.error("[RainX] native notification initialization failed", e);
    }
  };

  // Re-register whenever the user signs in (covers token-before-login).
  const authSub = supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user?.id) {
      setTimeout(() => void register(), 300);
    }
  });

  await register();

  return async () => {
    authSub.data.subscription.unsubscribe();
    for (const l of listeners) await l.remove();
  };
}
