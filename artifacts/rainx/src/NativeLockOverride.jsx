import React, { useEffect, useRef, useState } from "react";
import { Delete, Fingerprint } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import rainxLogoTransparent from "./assets/rainx-logo-transparent.png";
import {
  authenticateNativeLock,
  getNativeLockConfig,
  verifyNativePin,
} from "./nativeSecurity";

const FONT = "'Montserrat', sans-serif";

export default function NativeLockOverride({ account }) {
  const [locked, setLocked] = useState(false);
  const [config, setConfig] = useState({ pinEnabled: false, appLock: false, biometricEnabled: false, pinLength: 6 });
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [biometricRunning, setBiometricRunning] = useState(false);
  const biometricAttempted = useRef(false);

  const load = async (force = false) => {
    if (!Capacitor.isNativePlatform() || !account?.id) return;
    const bootKey = "rainx_native_webview_boot_v2";
    const isReload = sessionStorage.getItem(bootKey) === "1";
    if (!isReload) sessionStorage.setItem(bootKey, "1");

    const next = await getNativeLockConfig(account.id);
    setConfig(next);

    if (force || (!isReload && next.appLock)) {
      setLocked(!!next.appLock);
      setPin("");
      setError("");
      biometricAttempted.current = false;
    } else {
      setLocked(false);
    }
  };

  useEffect(() => {
    load();

    let listener;
    if (Capacitor.isNativePlatform()) {
      listener = App.addListener("appStateChange", async ({ isActive }) => {
        if (!isActive) return;
        const next = await getNativeLockConfig(account?.id);
        setConfig(next);
        if (next.appLock) {
          setLocked(true);
          setPin("");
          setError("");
          biometricAttempted.current = false;
        }
      });
    }
    return () => { listener?.then((l) => l.remove()).catch(() => {}); };
  }, [account?.id]);

  useEffect(() => {
    if (!locked || !config.biometricEnabled || biometricAttempted.current) return;
    biometricAttempted.current = true;
    setBiometricRunning(true);
    (async () => {
      const ok = await authenticateNativeLock(account?.id);
      setBiometricRunning(false);
      if (ok) {
        setLocked(false);
        setPin("");
        window.location.reload();
      } else {
        setError("");
      }
    })();
  }, [locked, config.biometricEnabled, account?.id]);

  if (!locked) return null;

  const pinLength = Math.max(4, Math.min(6, Number(config.pinLength) || 6));
  const addDigit = (digit) => {
    if (pin.length >= pinLength || biometricRunning) return;
    const next = pin + digit;
    setPin(next);
    if (next.length === pinLength) {
      setTimeout(() => unlock(next), 80);
    }
  };

  async function unlock(value = pin) {
    setError("");
    if (value.length !== pinLength) return;
    const ok = await verifyNativePin(value, account?.id);
    if (ok) {
      setLocked(false);
      setPin("");
      window.location.reload();
      return;
    }
    setPin("");
    setError("Incorrect PIN. Try again.");
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Unlock RainX"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100000,
        overflow: "hidden",
        background: "linear-gradient(180deg, #FFFFFF 0%, #FFFFFF 54%, #FFFDF4 72%, #FFE681 100%)",
        color: "#111418",
        fontFamily: FONT,
      }}
    >
      <div style={{ width: "100%", maxWidth: 520, minHeight: "100dvh", margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", boxSizing: "border-box", padding: "48px 24px 34px" }}>
        <div style={{ marginTop: 58, textAlign: "center" }}>
          <div style={{ width: 116, height: 116, margin: "0 auto 30px", borderRadius: "50%", background: "#050505", border: "4px solid #E9C94B", padding: 3, boxShadow: "0 10px 28px rgba(0,0,0,.08)", boxSizing: "border-box" }}>
            <img src={rainxLogoTransparent} alt="RainX" style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "50%" }} />
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -1 }}>Welcome back, RainX</div>
          <div style={{ marginTop: 8, color: "#737B85", fontSize: 15 }}>Enter your PIN to continue</div>
          {config.biometricEnabled && biometricRunning && (
            <div style={{ marginTop: 12, color: "#737B85", fontSize: 12, fontWeight: 700 }}>Confirm your identity…</div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 13, margin: "26px 0 28px" }}>
          {Array.from({ length: pinLength }).map((_, i) => (
            <span key={i} style={{
              width: 11, height: 11, borderRadius: "50%",
              background: i < pin.length ? "#C99A16" : "#E6E8EB",
              boxShadow: i < pin.length ? "0 2px 8px rgba(201,154,22,.25)" : "none",
            }} />
          ))}
        </div>

        <div style={{ width: "100%", maxWidth: 390, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {[1,2,3,4,5,6,7,8,9].map((digit) => (
            <button key={digit} type="button" onClick={() => addDigit(String(digit))} style={keyStyle} disabled={biometricRunning}>{digit}</button>
          ))}
          <button type="button" onClick={() => setPin((v) => v.slice(0, -1))} style={keyStyle} aria-label="Delete" disabled={biometricRunning}>
            <Delete size={28} strokeWidth={2} />
          </button>
          <button type="button" onClick={() => addDigit("0")} style={keyStyle} disabled={biometricRunning}>0</button>
          <button type="button" onClick={() => unlock()} style={{ ...keyStyle, background: "#11100D", color: "#F4D35E", fontSize: 14, fontWeight: 900, letterSpacing: .2 }} disabled={biometricRunning}>UNLOCK</button>
        </div>

        {error && <div style={{ marginTop: 14, color: "#B42318", fontSize: 12, fontWeight: 700 }}>{error}</div>}

        <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 18 }}>
          {config.biometricEnabled && !biometricRunning && (
            <button type="button" onClick={() => {
              biometricAttempted.current = true;
              setBiometricRunning(true);
              authenticateNativeLock(account?.id).then((ok) => {
                setBiometricRunning(false);
                if (ok) window.location.reload();
                else setError("Biometric authentication failed. Enter your PIN.");
              });
            }} style={{ border: 0, background: "rgba(255,255,255,.72)", borderRadius: 999, padding: "10px 15px", display: "flex", alignItems: "center", gap: 7, color: "#111418", fontFamily: FONT, fontWeight: 700, fontSize: 11.5, cursor: "pointer" }}>
              <Fingerprint size={17} /> Use biometrics
            </button>
          )}
          <button type="button" onClick={() => setError("Use your configured PIN to unlock RainX.")} style={{ border: 0, background: "rgba(255,255,255,.58)", borderRadius: 999, padding: "10px 15px", color: "#737B85", fontFamily: FONT, fontWeight: 700, fontSize: 11.5, cursor: "pointer" }}>
            Forgot PIN?
          </button>
        </div>
      </div>
    </div>
  );
}

const keyStyle = {
  width: "100%",
  aspectRatio: "1 / 1",
  border: "1px solid rgba(235,237,239,.95)",
  borderRadius: "50%",
  background: "rgba(255,255,255,.9)",
  boxShadow: "0 7px 20px rgba(40,45,50,.07)",
  color: "#111418",
  fontFamily: FONT,
  fontSize: 28,
  fontWeight: 800,
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
};
