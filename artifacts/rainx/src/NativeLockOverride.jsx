import React, { useEffect, useRef, useState } from "react";
import { Delete, Fingerprint, ScanFace } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import rainxLogoTransparent from "./assets/rainx-logo-transparent.png";
import {
  authenticateNativeLock,
  clearNativeSessionUnlock,
  getNativeBiometryInfo,
  getNativeLockConfig,
  hasNativeUnlockedSession,
  markNativeSessionUnlocked,
  verifyNativePin,
} from "./nativeSecurity";

const FONT = "'Montserrat', sans-serif";
const LOCK_EVENT = "rainx:native-lock-state";
const CONFIG_EVENT = "rainx:native-lock-config-changed";

function emitLockState(locked) {
  try { window.dispatchEvent(new CustomEvent(LOCK_EVENT, { detail: { locked } })); } catch {}
}

function hapticTap() {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(12);
  } catch {}
}

function biometricLabel(info) {
  if (info?.strongBiometryIsAvailable) return "Fingerprint";
  const type = String(info?.biometryType || "").toLowerCase();
  if (type.includes("face")) return "Face ID";
  if (type.includes("touch")) return "Touch ID";
  return "Biometric unlock";
}

function biometricIcon(info) {
  if (info?.strongBiometryIsAvailable) return Fingerprint;
  const type = String(info?.biometryType || "").toLowerCase();
  return type.includes("face") ? ScanFace : Fingerprint;
}

export default function NativeLockOverride({ account, initialLocked = false }) {
  const [locked, setLocked] = useState(!!initialLocked);
  const [config, setConfig] = useState({
    pinEnabled: false, appLock: false, biometricEnabled: false,
    pinLength: 4, pinLengthKnown: true,
  });
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [biometricRunning, setBiometricRunning] = useState(false);
  const [biometryInfo, setBiometryInfo] = useState(null);
  const [pressedKey, setPressedKey] = useState(null);
  const biometricAttempted = useRef(false);
  const unlockTimer = useRef(null);

  const refreshConfig = async () => {
    if (!Capacitor.isNativePlatform() || !account?.id) return;
    const [next, biometry] = await Promise.all([
      getNativeLockConfig(account.id), getNativeBiometryInfo(),
    ]);
    setConfig(next);
    setBiometryInfo(biometry || null);
    if (!next.appLock) {
      clearNativeSessionUnlock();
      setLocked(false);
      setPin("");
      setError("");
      emitLockState(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!Capacitor.isNativePlatform() || !account?.id) {
        if (mounted) setLocked(false);
        return;
      }
      try {
        const [next, biometry] = await Promise.all([
          getNativeLockConfig(account.id), getNativeBiometryInfo(),
        ]);
        if (!mounted) return;
        const shouldLock = !!next.appLock && (initialLocked || !hasNativeUnlockedSession(account.id));
        setConfig(next);
        setBiometryInfo(biometry || null);
        setLocked(shouldLock);
        setPin("");
        setError("");
        biometricAttempted.current = false;
        if (!shouldLock) emitLockState(false);
      } catch {
        if (mounted) {
          setLocked(true);
          emitLockState(true);
        }
      }
    })();

    const onLockState = (event) => {
      const nextLocked = !!event?.detail?.locked;
      setLocked(nextLocked);
      if (nextLocked) {
        clearNativeSessionUnlock();
        setPin("");
        setError("");
        biometricAttempted.current = false;
      }
    };
    const onConfigChanged = () => refreshConfig().catch(() => {});
    window.addEventListener(LOCK_EVENT, onLockState);
    window.addEventListener(CONFIG_EVENT, onConfigChanged);
    return () => {
      mounted = false;
      if (unlockTimer.current) window.clearTimeout(unlockTimer.current);
      window.removeEventListener(LOCK_EVENT, onLockState);
      window.removeEventListener(CONFIG_EVENT, onConfigChanged);
    };
  }, [account?.id, initialLocked]);

  const unlockWithBiometric = async () => {
    if (biometricRunning) return;
    hapticTap();
    setError("");
    setBiometricRunning(true);
    const ok = await authenticateNativeLock(account?.id);
    setBiometricRunning(false);
    if (!ok) {
      setError("Biometric authentication failed. Enter your PIN.");
      return;
    }
    markNativeSessionUnlocked(account?.id);
    setLocked(false);
    setPin("");
    setError("");
    emitLockState(false);
  };

  const unlock = async (value = pin) => {
    setError("");
    if (!/^\d{4,6}$/.test(value)) {
      setError(`Enter your ${config.pinLength || 4}-digit PIN.`);
      return;
    }
    const ok = await verifyNativePin(value, account?.id);
    if (ok) {
      markNativeSessionUnlocked(account?.id);
      setLocked(false);
      setPin("");
      setError("");
      emitLockState(false);
      return;
    }
    hapticTap();
    setPin("");
    setError("Incorrect PIN. Try again.");
  };

  const addDigit = (digit) => {
    if (biometricRunning || pin.length >= pinLength) return;
    const next = `${pin}${digit}`;
    setPin(next);
    if (config.pinLengthKnown && next.length === pinLength) {
      if (unlockTimer.current) window.clearTimeout(unlockTimer.current);
      unlockTimer.current = window.setTimeout(() => unlock(next), 80);
    }
  };

  const pressKey = (key, action) => {
    hapticTap();
    setPressedKey(key);
    action();
    window.setTimeout(() => setPressedKey(null), 90);
  };

  if (!locked) return null;

  const pinLength = Math.max(4, Math.min(6, Number(config.pinLength) || 4));
  const BioIcon = biometricIcon(biometryInfo);
  const bioAvailable = !!config.biometricEnabled && !!biometryInfo?.isAvailable;

  return (
    <div role="dialog" aria-modal="true" aria-label="Unlock RainX" style={{
      position: "fixed", inset: 0, zIndex: 1000000, overflow: "hidden",
      background: "linear-gradient(180deg, #FFFFFF 0%, #FFFFFF 57%, #FFFFFF 74%, #FFE681 100%)",
      color: "#111418", fontFamily: FONT, overscrollBehavior: "none",
    }}>
      <div style={{
        width: "100%", height: "100%", maxWidth: 520, margin: "0 auto",
        boxSizing: "border-box", padding: "24px 20px 20px", display: "flex",
        flexDirection: "column", alignItems: "center", overflow: "hidden",
      }}>
        <div style={{ textAlign: "center", flexShrink: 0, marginTop: 6 }}>
          <div style={{
            width: 96, height: 96, margin: "0 auto 18px", borderRadius: "50%",
            background: "#050505", border: "4px solid #E9C94B", padding: 3,
            boxSizing: "border-box", boxShadow: "0 9px 24px rgba(0,0,0,.08)",
          }}>
            <img src={rainxLogoTransparent} alt="RainX" style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "50%", display: "block" }} />
          </div>
          <div style={{ fontSize: "clamp(24px, 6vw, 29px)", lineHeight: 1.08, fontWeight: 800, letterSpacing: -1, whiteSpace: "nowrap" }}>
            Welcome back, RainX
          </div>
          <div style={{ marginTop: 8, color: "#737B85", fontSize: 15, lineHeight: 1.2 }}>
            Enter your PIN to continue
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 12, minHeight: 12, margin: "22px 0 18px", flexShrink: 0 }} aria-label={`${pin.length} of ${pinLength} digits entered`}>
          {Array.from({ length: pinLength }).map((_, index) => (
            <span key={index} style={{ width: 10, height: 10, borderRadius: "50%", background: index < pin.length ? "#C99A16" : "#E6E8EB", boxShadow: index < pin.length ? "0 2px 7px rgba(201,154,22,.25)" : "none" }} />
          ))}
        </div>

        {error ? (
          <div style={{ minHeight: 16, marginBottom: 7, color: "#B42318", fontSize: 12, fontWeight: 700, textAlign: "center", flexShrink: 0 }}>{error}</div>
        ) : <div style={{ height: 23, flexShrink: 0 }} />}

        <div style={{ width: "100%", maxWidth: 292, display: "grid", gridTemplateColumns: "repeat(3, 86px)", justifyContent: "center", gap: 12, flexShrink: 0 }}>
          {[1,2,3,4,5,6,7,8,9].map((digit) => (
            <button key={digit} type="button" onPointerDown={() => pressKey(String(digit), () => addDigit(String(digit)))} onClick={() => {}} disabled={biometricRunning} style={{ ...keyStyle, ...(pressedKey === String(digit) ? keyPressedStyle : null) }}>{digit}</button>
          ))}
          <button type="button" onPointerDown={() => pressKey("delete", () => setPin((value) => value.slice(0, -1)))} onClick={() => {}} aria-label="Delete last digit" disabled={biometricRunning} style={{ ...keyStyle, ...(pressedKey === "delete" ? keyPressedStyle : null) }}><Delete size={27} strokeWidth={2} /></button>
          <button type="button" onPointerDown={() => pressKey("0", () => addDigit("0"))} onClick={() => {}} disabled={biometricRunning} style={{ ...keyStyle, ...(pressedKey === "0" ? keyPressedStyle : null) }}>0</button>
          <button type="button" onPointerDown={() => pressKey("unlock", () => unlock())} onClick={() => {}} disabled={biometricRunning || pin.length !== pinLength} style={{ ...keyStyle, background: "#11100D", color: "#F4D35E", borderColor: "#11100D", fontSize: 12.5, fontWeight: 900, letterSpacing: 0.2, opacity: pin.length === pinLength && !biometricRunning ? 1 : 0.78, ...(pressedKey === "unlock" ? { transform: "scale(.96)" } : null) }}>UNLOCK</button>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 18, flexShrink: 0, flexWrap: "wrap" }}>
          {bioAvailable && (
            <button type="button" onClick={unlockWithBiometric} disabled={biometricRunning} style={{
              border: "1px solid #FFFFFF", background: "rgba(255,255,255,.82)", borderRadius: 999,
              padding: "10px 15px", display: "flex", alignItems: "center", gap: 8,
              color: "#111418", fontFamily: FONT, fontWeight: 800, fontSize: 11.5,
              cursor: "pointer", boxShadow: "0 2px 10px rgba(17,20,24,.04)", opacity: biometricRunning ? .65 : 1,
            }}>
              <BioIcon size={18} strokeWidth={2.1} />
              {biometricLabel(biometryInfo)}
            </button>
          )}
          <button type="button" onClick={() => { hapticTap(); setError("Use your configured PIN to unlock RainX."); }} style={{ border: 0, background: "rgba(255,255,255,.58)", borderRadius: 999, padding: "9px 14px", color: "#737B85", fontFamily: FONT, fontWeight: 700, fontSize: 11.5, cursor: "pointer" }}>
            Forgot PIN?
          </button>
        </div>

        {!bioAvailable && config.biometricEnabled && (
          <div style={{ marginTop: 8, color: "#737B85", fontSize: 10.5, fontWeight: 600, textAlign: "center" }}>
            Biometric unlock is enabled, but the device has no app-usable biometric available right now.
          </div>
        )}
      </div>
    </div>
  );
}

const keyStyle = {
  width: 86, height: 86, border: "1px solid rgba(235,237,239,.95)", borderRadius: "50%",
  background: "rgba(255,255,255,.94)", boxShadow: "0 6px 18px rgba(40,45,50,.07)",
  color: "#111418", fontFamily: FONT, fontSize: 28, fontWeight: 800, display: "grid",
  placeItems: "center", cursor: "pointer", padding: 0, touchAction: "manipulation",
  transition: "transform 90ms ease, box-shadow 90ms ease", WebkitTapHighlightColor: "transparent",
};
const keyPressedStyle = { transform: "scale(.96)", boxShadow: "0 3px 10px rgba(40,45,50,.10)" };
