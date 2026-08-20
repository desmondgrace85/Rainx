import React, { useEffect, useState } from "react";
import RainXApp from "./RainxApp";
import MoreLandingOverride from "./MoreLandingOverride";
import NativeLockOverride from "./NativeLockOverride";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { supabase } from "./supabaseClient";
import {
  clearNativeSessionUnlock,
  getNativeLockConfig,
  hasNativeUnlockedSession,
  markNativeSessionUnlocked,
} from "./nativeSecurity";

const LOCK_EVENT = "rainx:native-lock-state";
const LOCK_CONFIG_EVENT = "rainx:native-lock-config-changed";
const ROUTE_EVENT = "rainx:route-change";

function readHash() {
  const raw = window.location.hash.replace(/^#/, "");
  const [tab, sub] = raw.split("/");
  return { tab: tab || null, sub: sub ? decodeURIComponent(sub) : null };
}

function installRouteBridge() {
  const historyAny = window.history as any;
  if (historyAny.__rainxRouteBridgeInstalled) return () => {};

  const originalPush = historyAny.pushState.bind(historyAny);
  const originalReplace = historyAny.replaceState.bind(historyAny);

  const notify = () => {
    try { window.dispatchEvent(new Event(ROUTE_EVENT)); } catch {}
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
    if (historyAny.pushState !== originalPush) historyAny.pushState = originalPush;
    if (historyAny.replaceState !== originalReplace) historyAny.replaceState = originalReplace;
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
        clearNativeSessionUnlock();
        setLocked(false);
        setLockReady(true);
      } else if (_event === "SIGNED_IN" || _event === "INITIAL_SESSION") {
        // A successful login/new app start must always pass through the
        // configured native lock. Never trust a stale WebView session flag.
        clearNativeSessionUnlock();
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
        // The app-lock gate is authoritative at app start/sign-in.
        // sessionStorage is only used after an explicit unlock during this
        // running app session; it must never bypass the initial security gate.
        setLocked(!!config.appLock);
        setLockReady(true);
      })
      .catch(() => {
        if (!mounted) return;
        setLocked(true);
        setLockReady(true);
      });

    return () => { mounted = false; };
  }, [account?.id, authReady]);

  useEffect(() => {
    const onLockState = (event) => {
      if (!Capacitor.isNativePlatform()) return;

      const nextLocked = !!event?.detail?.locked;
      setLocked(nextLocked);
      setLockReady(true);

      if (account?.id) {
        if (nextLocked) clearNativeSessionUnlock();
        else markNativeSessionUnlocked(account.id);
      }
    };

    const onLockConfigChanged = async () => {
      if (!Capacitor.isNativePlatform() || !account?.id) return;

      try {
        const config = await getNativeLockConfig(account.id);
        setLockReady(true);

        if (!config.appLock) {
          clearNativeSessionUnlock();
          setLocked(false);
        }
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

      if (!wasBackgrounded) return;
      wasBackgrounded = false;

      try {
        const config = await getNativeLockConfig(account.id);

        if (mounted && config.appLock) {
          clearNativeSessionUnlock();
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

  const liveRoute = readHash();

  // Never let RainxApp paint its legacy More landing while authentication is
  // still resolving. That one render was the source of the old-screen flash.
  if (!authReady && liveRoute.tab === "more" && !liveRoute.sub) {
    return <div style={{ position: "fixed", inset: 0, background: "#fff" }} />;
  }

  if (Capacitor.isNativePlatform() && !authReady) {
    return <div style={{ position: "fixed", inset: 0, background: "#fff" }} />;
  }

  if (Capacitor.isNativePlatform() && account?.id && !lockReady) {
    return <div style={{ position: "fixed", inset: 0, background: "#fff" }} />;
  }

  if (Capacitor.isNativePlatform() && account?.id && locked) {
    return <NativeLockOverride account={account} initialLocked />;
  }

  // Read the URL synchronously as well as from React state. This prevents one
  // stale render of RainxApp's legacy More landing during navigation.
  const showMoreLanding =
    !!account?.id && liveRoute.tab === "more" && !liveRoute.sub;

  if (showMoreLanding) {
    return <MoreLandingOverride account={account} />;
  }

  return (
    <>
      <RainXApp />
      {account?.id && <NativeLockOverride account={account} initialLocked={false} />}
    </>
  );
}
