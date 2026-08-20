import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Device } from "@capacitor/device";
import { BiometricAuth } from "@aparajita/capacitor-biometric-auth";
import { SecureStorage, KeychainAccess } from "@aparajita/capacitor-secure-storage";
import { supabase } from "./supabaseClient";

const PREFIX = "rainx_";
const CONFIG_EVENT = "rainx:native-lock-config-changed";
const SESSION_UNLOCK_KEY = "rainx:native-unlocked-session";

const LEGACY_KEYS = {
  pinHash: `${PREFIX}pin_hash`,
  pinEnabled: `${PREFIX}pin_enabled`,
  appLock: `${PREFIX}app_lock`,
  biometric: `${PREFIX}biometric_enabled`,
  pinLength: `${PREFIX}pin_length`,
};

function keySet(accountId?: string) {
  const scope = accountId ? accountId.replace(/[^a-zA-Z0-9_-]/g, "_") : "device";
  return {
    pinHash: `${PREFIX}${scope}_pin_hash`,
    pinEnabled: `${PREFIX}${scope}_pin_enabled`,
    appLock: `${PREFIX}${scope}_app_lock`,
    biometric: `${PREFIX}${scope}_biometric_enabled`,
    pinLength: `${PREFIX}${scope}_pin_length`,
  };
}

export type NativeLockConfig = {
  pinEnabled: boolean;
  appLock: boolean;
  biometricEnabled: boolean;
  pinLength: number;
  pinLengthKnown: boolean;
};

const native = () => Capacitor.isNativePlatform();

function emitConfigChanged() {
  try { window.dispatchEvent(new Event(CONFIG_EVENT)); } catch {}
}

export function hasNativeUnlockedSession(accountId?: string) {
  if (!accountId || typeof sessionStorage === "undefined") return false;
  try { return sessionStorage.getItem(SESSION_UNLOCK_KEY) === accountId; }
  catch { return false; }
}

export function markNativeSessionUnlocked(accountId?: string) {
  if (!accountId || typeof sessionStorage === "undefined") return;
  try { sessionStorage.setItem(SESSION_UNLOCK_KEY, accountId); } catch {}
}

export function clearNativeSessionUnlock() {
  if (typeof sessionStorage === "undefined") return;
  try { sessionStorage.removeItem(SESSION_UNLOCK_KEY); } catch {}
}

async function secureSet(key: string, value: string) {
  if (!native()) return;
  await SecureStorage.set(key, value, true, false, KeychainAccess.whenUnlockedThisDeviceOnly);
}

async function secureGet(key: string): Promise<string | null> {
  if (!native()) return null;
  try {
    const value = await SecureStorage.get(key);
    return value == null ? null : String(value);
  } catch { return null; }
}

async function secureRemove(key: string) {
  if (!native()) return;
  try { await SecureStorage.remove(key); } catch {}
}

export async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function migratePinStorage(accountId?: string) {
  if (!native() || !accountId) return;

  const accountKeys = keySet(accountId);
  const deviceKeys = keySet();

  const accountValues = await Promise.all([
    secureGet(accountKeys.pinHash), secureGet(accountKeys.pinEnabled),
    secureGet(accountKeys.appLock), secureGet(accountKeys.biometric),
    secureGet(accountKeys.pinLength),
  ]);

  const legacyValues = await Promise.all([
    secureGet(LEGACY_KEYS.pinHash), secureGet(LEGACY_KEYS.pinEnabled),
    secureGet(LEGACY_KEYS.appLock), secureGet(LEGACY_KEYS.biometric),
    secureGet(LEGACY_KEYS.pinLength),
  ]);

  const deviceValues = await Promise.all([
    secureGet(deviceKeys.pinHash), secureGet(deviceKeys.pinEnabled),
    secureGet(deviceKeys.appLock), secureGet(deviceKeys.biometric),
    secureGet(deviceKeys.pinLength),
  ]);

  const sources = [deviceValues, legacyValues];
  const merged = accountValues.map((value, index) => {
    if (value !== null) return value;
    for (const source of sources) if (source[index] !== null) return source[index];
    return null;
  });

  const accountHasData =
    merged[0] !== null || merged[1] !== null || merged[2] !== null ||
    merged[3] !== null || merged[4] !== null;

  if (!accountHasData) return;

  await Promise.all([
    accountKeys.pinHash, accountKeys.pinEnabled, accountKeys.appLock,
    accountKeys.biometric, accountKeys.pinLength,
  ].map((key, index) =>
    merged[index] === null ? Promise.resolve() : secureSet(key, merged[index]!)
  ));

  await Promise.all([
    ...Object.values(deviceKeys).map(secureRemove),
    ...Object.values(LEGACY_KEYS).map(secureRemove),
  ]);
}

export async function getNativeLockConfig(accountId?: string): Promise<NativeLockConfig> {
  if (!native()) {
    return { pinEnabled: false, appLock: false, biometricEnabled: false, pinLength: 4, pinLengthKnown: true };
  }

  const resolvedAccountId = await resolveAccountId(accountId);
  await migratePinStorage(resolvedAccountId);

  const keys = keySet(resolvedAccountId);
  const [pinEnabled, appLock, biometricEnabled, pinLength, pinHash] = await Promise.all([
    secureGet(keys.pinEnabled), secureGet(keys.appLock), secureGet(keys.biometric),
    secureGet(keys.pinLength), secureGet(keys.pinHash),
  ]);

  const parsedLength = Number(pinLength);
  const pinLengthKnown = parsedLength >= 4 && parsedLength <= 6;
  const normalizedLength = pinLengthKnown ? parsedLength : 4;

  const hasStoredPin = !!pinHash;
  const recoveredPinEnabled = pinEnabled === "1" || hasStoredPin;
  const recoveredAppLock =
    appLock === "1" ||
    (appLock === null && (recoveredPinEnabled || biometricEnabled === "1"));

  return {
    pinEnabled: recoveredPinEnabled,
    appLock: recoveredAppLock,
    biometricEnabled: biometricEnabled === "1",
    pinLength: normalizedLength,
    pinLengthKnown,
  };
}

export async function saveNativePin(pin: string, accountId?: string) {
  if (!native()) throw new Error("PIN lock is available in the native app only.");
  if (!/^\d{4,6}$/.test(pin)) throw new Error("PIN must contain 4–6 digits.");

  const resolvedAccountId = await resolveAccountId(accountId);
  if (!resolvedAccountId) throw new Error("Your account session is not ready.");

  const keys = keySet(resolvedAccountId);
  await secureSet(keys.pinHash, await sha256(pin));
  await secureSet(keys.pinLength, String(pin.length));
  await secureSet(keys.pinEnabled, "1");
  await secureSet(keys.appLock, "1");
  emitConfigChanged();
}

async function resolveAccountId(accountId?: string) {
  if (accountId) return accountId;
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id || undefined;
  } catch { return undefined; }
}

async function findMatchingPinKey(pin: string, accountId?: string) {
  const hash = await sha256(pin);
  const resolvedAccountId = await resolveAccountId(accountId);
  const candidates = [keySet(resolvedAccountId), keySet(accountId), keySet(), LEGACY_KEYS];
  const seen = new Set<string>();

  for (const keys of candidates) {
    if (seen.has(keys.pinHash)) continue;
    seen.add(keys.pinHash);
    const stored = await secureGet(keys.pinHash);
    if (stored && stored === hash) return keys;
  }
  return null;
}

export async function verifyNativePin(pin: string, accountId?: string): Promise<boolean> {
  if (!native() || !/^\d{4,6}$/.test(pin)) return false;
  await getNativeLockConfig(accountId);
  return !!(await findMatchingPinKey(pin, accountId));
}

export async function disableNativePin(first: string, second?: string) {
  if (!native()) throw new Error("PIN lock is available in the native app only.");

  let pin = first;
  let accountId = second;

  if (!/^\d{4,6}$/.test(first) && /^\d{4,6}$/.test(second || "")) {
    accountId = first;
    pin = second!;
  }

  if (!/^\d{4,6}$/.test(pin)) throw new Error("Enter your current PIN.");

  const matchingKeys = await findMatchingPinKey(pin, accountId);
  if (!matchingKeys) throw new Error("Incorrect PIN.");

  const resolvedAccountId = await resolveAccountId(accountId);
  const allKeys = [keySet(resolvedAccountId), keySet(accountId), keySet(), LEGACY_KEYS];
  const uniqueKeys = new Map(allKeys.map((keys) => [keys.pinHash, keys]));

  await Promise.all(
    [...uniqueKeys.values()].flatMap((keys) => [
      secureRemove(keys.pinHash), secureRemove(keys.pinLength),
      secureRemove(keys.pinEnabled), secureRemove(keys.appLock),
      secureRemove(keys.biometric),
    ])
  );

  clearNativeSessionUnlock();
  emitConfigChanged();
}

export async function setNativeAppLock(enabled: boolean, accountId?: string) {
  const resolvedAccountId = await resolveAccountId(accountId);
  if (!resolvedAccountId) throw new Error("Your account session is not ready.");

  const config = await getNativeLockConfig(resolvedAccountId);
  if (enabled && !config.pinEnabled && !config.biometricEnabled) {
    throw new Error("Set up a PIN or device biometric first.");
  }

  await secureSet(keySet(resolvedAccountId).appLock, enabled ? "1" : "0");
  if (!enabled) clearNativeSessionUnlock();
  emitConfigChanged();
}

export async function setNativeBiometricEnabled(enabled: boolean, accountId?: string) {
  if (!native()) throw new Error("Biometrics are available in the native app only.");

  const resolvedAccountId = await resolveAccountId(accountId);
  if (!resolvedAccountId) throw new Error("Your account session is not ready.");

  const keys = keySet(resolvedAccountId);

  if (enabled) {
    const result = await BiometricAuth.checkBiometry();
    if (!result.isAvailable) {
      throw new Error("No app-usable biometric authentication is enrolled on this device.");
    }

    await BiometricAuth.authenticate({
      reason: "Confirm your identity to enable RainX biometric lock",
      cancelTitle: "Cancel",
      allowDeviceCredential: true,
      iosFallbackTitle: "Use passcode",
      androidTitle: "Enable RainX biometric lock",
      androidSubtitle: "Confirm your device identity",
      androidConfirmationRequired: false,
    });

    await secureSet(keys.biometric, "1");
    await secureSet(keys.appLock, "1");
  } else {
    await secureSet(keys.biometric, "0");
    const config = await getNativeLockConfig(resolvedAccountId);
    if (!config.pinEnabled) await secureSet(keys.appLock, "0");
  }

  emitConfigChanged();
}

export async function getNativeBiometryInfo() {
  if (!native()) return null;
  try { return await BiometricAuth.checkBiometry(); } catch { return null; }
}

export async function authenticateNativeLock(accountId?: string): Promise<boolean> {
  if (!native()) return true;

  const config = await getNativeLockConfig(accountId);
  if (!config.appLock || !config.biometricEnabled) return false;

  try {
    await BiometricAuth.authenticate({
      reason: "Unlock RainX",
      cancelTitle: "Use PIN",
      allowDeviceCredential: false,
      iosFallbackTitle: "Use PIN",
      androidTitle: "Unlock RainX",
      androidSubtitle: "Confirm your identity",
      androidConfirmationRequired: false,
    });
    return true;
  } catch { return false; }
}

export async function getNativeDeviceInfo() {
  if (!native()) return null;

  const [id, info, app] = await Promise.all([Device.getId(), Device.getInfo(), App.getInfo()]);

  return {
    deviceId: id.identifier,
    platform: info.platform,
    name: info.name || null,
    model: info.model || null,
    manufacturer: info.manufacturer || null,
    osVersion: info.osVersion || null,
    appVersion: app.version || app.build || "unknown",
  };
}

export async function registerNativeDeviceSession() {
  if (!native()) return;
  const { data } = await supabase.auth.getSession();
  if (!data.session) return;

  const device = await getNativeDeviceInfo();
  if (!device) return;

  await supabase.rpc("register_my_device_session", {
    p_device_id: device.deviceId,
    p_platform: device.platform,
    p_device_name: device.name,
    p_manufacturer: device.manufacturer,
    p_model: device.model,
    p_os_version: device.osVersion,
    p_app_version: device.appVersion,
  });
}

export async function recordNativeLogin() {
  if (!native()) return;
  const device = await getNativeDeviceInfo();
  if (!device) return;

  await supabase.rpc("record_my_login_event", {
    p_device_id: device.deviceId,
    p_platform: device.platform,
    p_device_name: device.name,
    p_manufacturer: device.manufacturer,
    p_model: device.model,
    p_os_version: device.osVersion,
    p_app_version: device.appVersion,
  });
}

export async function attachNativeResumeListener(onLocked: () => void, accountId?: string) {
  if (!native()) return { remove: async () => {} };

  let wasBackgrounded = false;

  return App.addListener("appStateChange", async ({ isActive }) => {
    if (!isActive) {
      wasBackgrounded = true;
      return;
    }

    if (!wasBackgrounded) {
      await registerNativeDeviceSession().catch(() => {});
      return;
    }

    wasBackgrounded = false;
    const config = await getNativeLockConfig(accountId);

    if (config.appLock) {
      clearNativeSessionUnlock();
      onLocked();
    }

    await registerNativeDeviceSession().catch(() => {});
  });
}
