import React, { useEffect, useRef, useState } from "react";
import { Delete, Fingerprint } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import rainxLogoTransparent from "./assets/rainx-logo-transparent.png";
import {
  authenticateNativeLock,
  getNativeLockConfig,
  verifyNativePin,
} from "./nativeSecurity";

const FONT = "'Montserrat', sans-serif";
const LOCK_EVENT = "rainx:native-lock-state";

function emitLockState(locked) {
  try {
    window.dispatchEvent(new CustomEvent(LOCK_EVENT, { detail: { locked } }));
  } catch {}
}

export default function NativeLockOverride({ account }) {
  const [locked, setLocked] = useState(false);
  const [config, setConfig] = useState({
    pinEnabled: false,
    appLock: false,
    biometricEnabled: false,
    pinLength: 6,
  });
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [biometricRunning, setBiometricRunning] = useState(false);
  const biometricAttempted = useRef(false);

  const lockNow = async () => {
    if (!Capacitor.isNativePlatform() || !account?.id) return;
    const next = await getNativeLockConfig(account.id);
    setConfig(next);

    if (next.appLock) {
      setLocked(true);
      setPin("");
      setError("");
      biometricAttempted.current = false;
      emitLockState(true);
    } else {
      setLocked(false);
      emitLockState(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!Capacitor.isNativePlatform() || !account?.id) {
        if (mounted) {
          setLocked(false);
          emitLockState(false);
        }
        return;
      }

      const next = await getNativeLockConfig(account.id);
      if (!mounted) return;

      setConfig(next);
      setLocked(!!next.appLock);
      setPin("");
      setError("");
      biometricAttempted.current = false;
      emitLockState(!!next.appLock);
    })();

    let listener;
    if (Capacitor.isNativePlatform()) {
      listener = CapacitorApp.addListener("appStateChange", async ({ isActive }) => {
        if (!isActive || !account?.id) return;
        await lockNow();
      });
    }

    return () => {
      mounted = false;
      listener?.then((l) => l.remove()).catch(() => {});
    };
  }, [account?.id]);

  useEffect(() => {
    if (!locked || !config.biometricEnabled || biometricAttempted.current) return;

    biometricAttempted.current = true;
    setBiometricRunning(true);
    setError("");

    (async () => {
      const ok = await authenticateNativeLock(account?.id);
      if (!ok) {
        setBiometricRunning(false);
        setError("");
        return;
      }

      setBiometricRunning(false);
      setLocked(false);
      setPin("");
      setError("");
      emitLockState(false);
    })();
  }, [locked, config.biometricEnabled, account?.id]);

  const unlock = async (value = pin) => {
    setError("");
    if (value.length !== config.pinLength) return;

    const ok = await verifyNativePin(value, account?.id);
    if (ok) {
      setLocked(false);
      setPin("");
      setError("");
      emitLockState(false);
      return;
    }

    setPin("");
    setError("Incorrect PIN. Try again.");
  };

  const addDigit = (digit) => {
    if (biometricRunning) return;
    if (pin.length >= config.pinLength) return;

    const next = `${pin}${digit}`;
    setPin(next);

    if (next.length === config.pinLength) {
      window.setTimeout(() => unlock(next), 70);
    }
  };

  if (!locked) return null;

  const pinLength = Math.max(4, Math.min(6, Number(config.pinLength) || 6));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Unlock RainX"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000000,
        overflow: "hidden",
        background:
          "linear-gradient(180deg, #FFFFFF 0%, #FFFFFF 57%, #FFFDF3 74%, #FFE681 100%)",
        color: "#111418",
        fontFamily: FONT,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          maxWidth: 520,
          margin: "0 auto",
          boxSizing: "border-box",
          padding: "24px 20px 20px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            textAlign: "center",
            flexShrink: 0,
            marginTop: 6,
          }}
        >
          <div
            style={{
              width: 96,
              height: 96,
              margin: "0 auto 18px",
              borderRadius: "50%",
              background: "#050505",
              border: "4px solid #E9C94B",
              padding: 3,
              boxSizing: "border-box",
              boxShadow: "0 9px 24px rgba(0,0,0,.08)",
            }}
          >
            <img
              src={rainxLogoTransparent}
              alt="RainX"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                borderRadius: "50%",
                display: "block",
              }}
            />
          </div>

          <div
            style={{
              fontSize: "clamp(24px, 6vw, 29px)",
              lineHeight: 1.08,
              fontWeight: 800,
              letterSpacing: -1,
              whiteSpace: "nowrap",
            }}
          >
            Welcome back, RainX
          </div>

          <div
            style={{
              marginTop: 8,
              color: "#737B85",
              fontSize: 15,
              lineHeight: 1.2,
            }}
          >
            Enter your PIN to continue
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 12,
            height: 12,
            margin: "22px 0 18px",
            flexShrink: 0,
          }}
          aria-label={`${pin.length} of ${pinLength} digits entered`}
        >
          {Array.from({ length: pinLength }).map((_, index) => (
            <span
              key={index}
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: index < pin.length ? "#C99A16" : "#E6E8EB",
                boxShadow:
                  index < pin.length
                    ? "0 2px 7px rgba(201,154,22,.25)"
                    : "none",
              }}
            />
          ))}
        </div>

        {error ? (
          <div
            style={{
              minHeight: 16,
              marginBottom: 7,
              color: "#B42318",
              fontSize: 12,
              fontWeight: 700,
              textAlign: "center",
              flexShrink: 0,
            }}
          >
            {error}
          </div>
        ) : (
          <div style={{ height: 23, flexShrink: 0 }} />
        )}

        <div
          style={{
            width: "100%",
            maxWidth: 292,
            display: "grid",
            gridTemplateColumns: "repeat(3, 86px)",
            justifyContent: "center",
            gap: 12,
            flexShrink: 0,
          }}
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => addDigit(String(digit))}
              disabled={biometricRunning}
              style={keyStyle}
            >
              {digit}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setPin((value) => value.slice(0, -1))}
            aria-label="Delete last digit"
            disabled={biometricRunning}
            style={keyStyle}
          >
            <Delete size={27} strokeWidth={2} />
          </button>

          <button
            type="button"
            onClick={() => addDigit("0")}
            disabled={biometricRunning}
            style={keyStyle}
          >
            0
          </button>

          <button
            type="button"
            onClick={() => unlock()}
            disabled={biometricRunning || pin.length !== pinLength}
            style={{
              ...keyStyle,
              background: "#11100D",
              color: "#F4D35E",
              borderColor: "#11100D",
              fontSize: 12.5,
              fontWeight: 900,
              letterSpacing: 0.2,
              opacity: pin.length === pinLength && !biometricRunning ? 1 : 0.78,
            }}
          >
            UNLOCK
          </button>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            marginTop: 18,
            flexShrink: 0,
          }}
        >
          {config.biometricEnabled && !biometricRunning && (
            <button
              type="button"
              onClick={async () => {
                biometricAttempted.current = true;
                setBiometricRunning(true);
                setError("");
                const ok = await authenticateNativeLock(account?.id);
                setBiometricRunning(false);
                if (ok) {
                  setLocked(false);
                  setPin("");
                  emitLockState(false);
                } else {
                  setError("Biometric authentication failed. Enter your PIN.");
                }
              }}
              style={{
                border: 0,
                background: "rgba(255,255,255,.72)",
                borderRadius: 999,
                padding: "9px 14px",
                display: "flex",
                alignItems: "center",
                gap: 7,
                color: "#111418",
                fontFamily: FONT,
                fontWeight: 700,
                fontSize: 11.5,
                cursor: "pointer",
              }}
            >
              <Fingerprint size={17} />
              Use biometrics
            </button>
          )}

          <button
            type="button"
            onClick={() => setError("Use your configured PIN to unlock RainX.")}
            style={{
              border: 0,
              background: "rgba(255,255,255,.58)",
              borderRadius: 999,
              padding: "9px 14px",
              color: "#737B85",
              fontFamily: FONT,
              fontWeight: 700,
              fontSize: 11.5,
              cursor: "pointer",
            }}
          >
            Forgot PIN?
          </button>
        </div>
      </div>
    </div>
  );
}

const keyStyle = {
  width: 86,
  height: 86,
  border: "1px solid rgba(235,237,239,.95)",
  borderRadius: "50%",
  background: "rgba(255,255,255,.94)",
  boxShadow: "0 6px 18px rgba(40,45,50,.07)",
  color: "#111418",
  fontFamily: FONT,
  fontSize: 28,
  fontWeight: 800,
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
  padding: 0,
  touchAction: "manipulation",
};
