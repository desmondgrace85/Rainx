import React, { useEffect, useState } from "react";
import RainXApp from "./RainxApp";
import MoreLandingOverride from "./MoreLandingOverride";
import NativeLockOverride from "./NativeLockOverride";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { supabase } from "./supabaseClient";
import { getNativeLockConfig } from "./nativeSecurity";

const LOCK_EVENT = "rainx:native-lock-state";
const LOCK_CONFIG_EVENT = "rainx:native-lock-config-changed";
const ROUTE_EVENT = "rainx:route-change";

function readHash() {
  const raw = window.location.hash.replace(/^#/, "");
  const [tab, sub] = raw.split("/");
  return { tab: tab || null, sub: sub ? decodeURIComponent(sub) : null };
}

function installRouteBridge() {
  // RainX routing uses history.pushState/replaceState. Those APIs do not fire
  // hashchange, which was the reason the old More page could remain mounted
  // until a manual refresh. Bridge both APIs into one synchronous route event.
  const historyAny = window.history as any;
  if (historyAny.__rainxRouteBridgeInstalled) return () => {};

  const originalPush = historyAny.pushState.bind(historyAny);
  const originalReplace = historyAny.replaceState.bind(historyAny);

  const notify = () => {
    try {
      window.dispatchEvent(new Event(ROUTE_EVENT));
    } catch {}
  };

  historyAny.pushState = function (...args) {
    const result = originalPush(...args);
    notify();
    return result;
  };

  historyAny.replaceState = function (...args) {
    const result = originalReplace(...args);
    notify();
    return result;
  };

  historyAny.__rainxRouteBridgeInstalled = true;

  return () => {
    // Only restore if this bridge still owns the methods.
    if (historyAny.pushState !== originalPush) {
      historyAny.pushState = originalPush;
    }
    if (historyAny.replaceState !== originalReplace) {
      historyAny.replaceState = originalReplace;
    }
    delete historyAny.__rainxRouteBridgeInstalled;
  };
}

export default function App() {
  const [route, setRoute] = useState(() => readHash());
  const [account, setAccount] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [lockReady, setLockReady] = useState(!Capacitor.isNativePlatform());
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    const updateRoute = () => setRoute(readHash());

    const removeBridge = installRouteBridge();
    window.addEventListener("hashchange", updateRoute);
    window.addEventListener("popstate", updateRoute);
    window.addEventListener(ROUTE_EVENT, updateRoute);

    updateRoute();

    return () => {
      removeBridge();
      window.removeEventListener("hashchange", updateRoute);
      window.removeEventListener("popstate", updateRoute);
      window.removeEventListener(ROUTE_EVENT, updateRoute);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession()
      .then(({ data }) => {
        if (!mounted) return;
        const user = data.session?.user;
        setAccount(user ? { id: user.id, email: user.email } : null);
        setAuthReady(true);
      })
      .catch(() => {
        if (mounted) setAuthReady(true);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      const user = session?.user;
      setAccount(user ? { id: user.id, email: user.email } : null);
      if (!user) {
        setLocked(false);
        setLockReady(true);
      }
      setAuthReady(true);
    });

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      setLockReady(true);
      setLocked(false);
      return;
    }

    if (!authReady) {
      setLockReady(false);
      return;
    }

    if (!account?.id) {
      setLocked(false);
      setLockReady(true);
      return;
    }

    let mounted = true;
    setLockReady(false);

    getNativeLockConfig(account.id)
      .then((config) => {
        if (!mounted) return;
        setLocked(!!config.appLock);
        setLockReady(true);
      })
      .catch(() => {
        if (!mounted) return;
        // Fail closed for a signed-in native session: the lock screen will
        // re-check storage rather than silently exposing the app.
        setLocked(true);
        setLockReady(true);
      });

    return () => {
      mounted = false;
    };
  }, [account?.id, authReady]);

  useEffect(() => {
    const onLockState = (event) => {
      if (!Capacitor.isNativePlatform()) return;
      const nextLocked = !!event?.detail?.locked;
      setLocked(nextLocked);
      setLockReady(true);
    };

    const onLockConfigChanged = async () => {
      if (!Capacitor.isNativePlatform() || !account?.id) return;
      try {
        const config = await getNativeLockConfig(account.id);
        setLockReady(true);
        // A settings change may disable the lock. Enabling/changing a PIN
        // does not immediately interrupt the current session; it takes effect
        // on the next cold start or background -> foreground transition.
        if (!config.appLock) setLocked(false);
      } catch {}
    };

    window.addEventListener(LOCK_EVENT, onLockState);
    window.addEventListener(LOCK_CONFIG_EVENT, onLockConfigChanged);

    return () => {
      window.removeEventListener(LOCK_EVENT, onLockState);
      window.removeEventListener(LOCK_CONFIG_EVENT, onLockConfigChanged);
    };
  }, [account?.id]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !authReady || !account?.id) return;

    let mounted = true;
    let wasBackgrounded = false;
    let listener;

    CapacitorApp.addListener("appStateChange", async ({ isActive }) => {
      if (!mounted) return;

      if (!isActive) {
        wasBackgrounded = true;
        return;
      }

      // Do not lock merely because the native WebView becomes active during
      // initial startup. Only a real background -> foreground transition locks.
      if (!wasBackgrounded) return;
      wasBackgrounded = false;

      try {
        const config = await getNativeLockConfig(account.id);
        if (mounted && config.appLock) {
          setLocked(true);
          setLockReady(true);
          window.dispatchEvent(
            new CustomEvent(LOCK_EVENT, { detail: { locked: true } })
          );
        }
      } catch {}
    }).then((handle) => {
      listener = handle;
    }).catch(() => {});

    return () => {
      mounted = false;
      listener?.remove?.();
    };
  }, [account?.id, authReady]);

  if (Capacitor.isNativePlatform() && !authReady) {
    return <div style={{ position: "fixed", inset: 0, background: "#fff" }} />;
  }

  if (Capacitor.isNativePlatform() && account?.id && !lockReady) {
    return <div style={{ position: "fixed", inset: 0, background: "#fff" }} />;
  }

  if (Capacitor.isNativePlatform() && account?.id && locked) {
    return <NativeLockOverride account={account} />;
  }

  // IMPORTANT: More owns the #more landing route. RainxApp is not mounted
  // underneath it, so the legacy More landing cannot render first.
  const showMoreLanding = !!account?.id && route.tab === "more" && !route.sub;

  if (showMoreLanding) {
    return <MoreLandingOverride account={account} />;
  }

  return (
    <>
      <RainXApp />
      {account?.id && <NativeLockOverride account={account} />}
    </>
  );
}
