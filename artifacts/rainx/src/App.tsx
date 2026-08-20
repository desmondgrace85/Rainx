import React, { useEffect, useState } from "react";
import RainXApp from "./RainxApp";
import MoreLandingOverride from "./MoreLandingOverride";
import NativeLockOverride from "./NativeLockOverride";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { supabase } from "./supabaseClient";
import { getNativeLockConfig } from "./nativeSecurity";

const LOCK_EVENT = "rainx:native-lock-state";

function readHash() {
  const raw = window.location.hash.replace(/^#/, "");
  const [tab, sub] = raw.split("/");
  return { tab: tab || null, sub: sub ? decodeURIComponent(sub) : null };
}

export default function App() {
  const [route, setRoute] = useState(() => readHash());
  const [account, setAccount] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [shellReady, setShellReady] = useState(!Capacitor.isNativePlatform());

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
      setAuthReady(true);
    }).catch(() => mounted && setAuthReady(true));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setAccount(
        session?.user
          ? { id: session.user.id, email: session.user.email }
          : null
      );
      setAuthReady(true);
    });

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !authReady || !account?.id) {
      if (!Capacitor.isNativePlatform() || !authReady || !account?.id) {
        setShellReady(true);
      }
      return;
    }

    let mounted = true;

    getNativeLockConfig(account.id).then((config) => {
      if (mounted) setShellReady(!config.appLock);
    }).catch(() => mounted && setShellReady(true));

    return () => { mounted = false; };
  }, [account?.id, authReady]);

  useEffect(() => {
    const onLockState = (event) => {
      if (!Capacitor.isNativePlatform()) return;
      setShellReady(!event?.detail?.locked);
    };

    window.addEventListener(LOCK_EVENT, onLockState);
    return () => window.removeEventListener(LOCK_EVENT, onLockState);
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !authReady || !account?.id) return;

    let mounted = true;
    let listener;

    CapacitorApp.addListener("appStateChange", async ({ isActive }) => {
      if (!mounted || isActive) return;

      const config = await getNativeLockConfig(account.id);
      if (mounted && config.appLock) setShellReady(false);
    }).then((handle) => { listener = handle; }).catch(() => {});

    return () => {
      mounted = false;
      listener?.remove?.();
    };
  }, [account?.id, authReady]);

  if (Capacitor.isNativePlatform() && !authReady) {
    return <div style={{ position: "fixed", inset: 0, background: "#fff" }} />;
  }

  const showMoreLanding = !!account?.id && route.tab === "more" && !route.sub;

  if (Capacitor.isNativePlatform() && account?.id && !shellReady) {
    return (
      <>
        <div style={{ position: "fixed", inset: 0, background: "#fff", zIndex: 999998 }} />
        <NativeLockOverride account={account} />
      </>
    );
  }

  return showMoreLanding
    ? <MoreLandingOverride account={account} />
    : (
      <>
        <RainXApp />
        {account?.id && <NativeLockOverride account={account} />}
      </>
    );
}
