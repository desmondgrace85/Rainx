import React, { useEffect, useState } from "react";
import RainXApp from "./RainxApp";
import MoreLandingOverride from "./MoreLandingOverride";
import NativeLockOverride from "./NativeLockOverride";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { supabase } from "./supabaseClient";
import { getNativeLockConfig } from "./nativeSecurity";

function readHash() {
  const raw = window.location.hash.replace(/^#/, "");
  const [tab, sub] = raw.split("/");
  return { tab: tab || null, sub: sub ? decodeURIComponent(sub) : null };
}

const LOCK_EVENT = "rainx:native-lock-state";
const BOOT_KEY = "rainx_native_webview_boot_v2";

export default function App() {
  const [route, setRoute] = useState(() => readHash());
  const [account, setAccount] = useState(null);
  const [nativeShellReady, setNativeShellReady] = useState(
    () => !Capacitor.isNativePlatform()
  );

  useEffect(() => {
    const onHash = () => setRoute(readHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setAccount(
        data.session?.user
          ? { id: data.session.user.id, email: data.session.user.email }
          : null
      );
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;
        setAccount(
          session?.user
            ? { id: session.user.id, email: session.user.email }
            : null
        );
      }
    );

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  // Native boot gate:
  // The old NativeSecurityGate still exists inside RainxApp for compatibility,
  // but RainxApp is never mounted while the new native lock is active. This
  // removes the one-frame legacy lock flash and prevents the old rectangular
  // keypad from appearing before the new lock.
  useEffect(() => {
    let mounted = true;

    if (!Capacitor.isNativePlatform()) {
      setNativeShellReady(true);
      return undefined;
    }

    if (!account?.id) {
      setNativeShellReady(false);
      return undefined;
    }

    (async () => {
      const config = await getNativeLockConfig(account.id);
      if (!mounted) return;

      if (config.appLock) {
        setNativeShellReady(false);
      } else {
        sessionStorage.setItem(BOOT_KEY, "1");
        setNativeShellReady(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [account?.id]);

  // The new lock overlay tells the app shell exactly when it is safe to mount
  // the main application. No reload is needed after unlocking.
  useEffect(() => {
    const onLockState = (event) => {
      if (!Capacitor.isNativePlatform()) return;
      const locked = !!event?.detail?.locked;

      if (!locked) {
        sessionStorage.setItem(BOOT_KEY, "1");
        setNativeShellReady(true);
      } else {
        setNativeShellReady(false);
      }
    };

    window.addEventListener(LOCK_EVENT, onLockState);
    return () => window.removeEventListener(LOCK_EVENT, onLockState);
  }, []);

  // When the native app goes into the background, unmount the old application
  // tree before the resume lock appears. On resume, NativeLockOverride will
  // authenticate first and then signal the shell to mount again.
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !account?.id) return undefined;

    let mounted = true;
    let listener;

    CapacitorApp.addListener("appStateChange", async ({ isActive }) => {
      if (!mounted || isActive) return;

      const config = await getNativeLockConfig(account.id);
      if (!mounted || !config.appLock) return;

      setNativeShellReady(false);
    }).then((handle) => {
      listener = handle;
    });

    return () => {
      mounted = false;
      listener?.remove?.();
    };
  }, [account?.id]);

  const showMoreLanding =
    !!account?.id && route.tab === "more" && !route.sub;

  const showMainApp = !Capacitor.isNativePlatform() || nativeShellReady;

  if (account && Capacitor.isNativePlatform() && !nativeShellReady) {
    return (
      <>
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "#FFFFFF",
            zIndex: 999998,
          }}
        />
        <NativeLockOverride account={account} />
      </>
    );
  }

  return (
    <>
      {showMainApp && (
        showMoreLanding ? (
          // More is a standalone landing screen. The old More landing is not
          // rendered underneath it anymore, so there is no refresh/scroll
          // required to reveal the new screen.
          <MoreLandingOverride account={account} />
        ) : (
          <RainXApp />
        )
      )}

      {account?.id && <NativeLockOverride account={account} />}
    </>
  );
}
