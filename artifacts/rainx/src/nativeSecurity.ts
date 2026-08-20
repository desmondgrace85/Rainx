import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Device } from "@capacitor/device";
import { BiometricAuth } from "@aparajita/capacitor-biometric-auth";
import { SecureStorage, KeychainAccess } from "@aparajita/capacitor-secure-storage";
import { supabase } from "./supabaseClient";

const PREFIX = "rainx_";
const KEYS = {
  pinHash: `${PREFIX}pin_hash`,
  pinEnabled: `${PREFIX}pin_enabled`,
  appLock: `${PREFIX}app_lock`,
  biometric: `${PREFIX}biometric_enabled`,
};

export type NativeLockConfig = {
  pinEnabled: boolean;
  appLock: boolean;
  biometricEnabled: boolean;
};

const native = () => Capacitor.isNativePlatform();

async function secureSet(key: string, value: string) {
  if (!native()) return;
  await SecureStorage.set(key, value, true, false, KeychainAccess.whenUnlockedThisDeviceOnly);
}

async function secureGet(key: string): Promise<string | null> {
  if (!native()) return null;
  try { return String(await SecureStorage.get(key)); } catch { return null; }
}

async function secureRemove(key: string) {
  if (!native()) return;
  try { await SecureStorage.remove(key); } catch { /* already absent */ }
}

export async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function getNativeLockConfig(): Promise<NativeLockConfig> {
  if (!native()) return { pinEnabled: false, appLock: false, biometricEnabled: false };
  const [pinEnabled, appLock, biometricEnabled] = await Promise.all([
    secureGet(KEYS.pinEnabled), secureGet(KEYS.appLock), secureGet(KEYS.biometric),
  ]);
  return {
    pinEnabled: pinEnabled === "1",
    appLock: appLock === "1",
    biometricEnabled: biometricEnabled === "1",
  };
}

export async function saveNativePin(pin: string) {
  if (!native()) throw new Error("PIN lock is available in the native app only.");
  if (!/^\d{4,6}$/.test(pin)) throw new Error("PIN must contain 4–6 digits.");
  await secureSet(KEYS.pinHash, await sha256(pin));
  await secureSet(KEYS.pinEnabled, "1");
  await secureSet(KEYS.appLock, "1");
}

export async function verifyNativePin(pin: string): Promise<boolean> {
  if (!native()) return false;
  const hash = await secureGet(KEYS.pinHash);
  return !!hash && hash === await sha256(pin);
}

export async function disableNativePin(pin: string) {
  if (!(await verifyNativePin(pin))) throw new Error("Incorrect PIN.");
  await secureRemove(KEYS.pinHash);
  await secureSet(KEYS.pinEnabled, "0");
  await secureSet(KEYS.appLock, "0");
}

export async function setNativeAppLock(enabled: boolean) {
  const config = await getNativeLockConfig();
  if (enabled && !config.pinEnabled && !config.biometricEnabled) {
    throw new Error("Set up a PIN or device biometric first.");
  }
  await secureSet(KEYS.appLock, enabled ? "1" : "0");
}

export async function setNativeBiometricEnabled(enabled: boolean) {
  if (!native()) throw new Error("Biometrics are available in the native app only.");
  if (enabled) {
    const result = await BiometricAuth.checkBiometry();
    if (!result.isAvailable) throw new Error("No app-usable biometric authentication is enrolled on this device.");
    await BiometricAuth.authenticate({
      reason: "Confirm your identity to enable RainX biometric lock",
      cancelTitle: "Cancel",
      allowDeviceCredential: true,
      iosFallbackTitle: "Use passcode",
      androidTitle: "Enable RainX biometric lock",
      androidSubtitle: "Confirm your device identity",
      androidConfirmationRequired: false,
    });
    await secureSet(KEYS.biometric, "1");
    await secureSet(KEYS.appLock, "1");
  } else {
    await secureSet(KEYS.biometric, "0");
    const config = await getNativeLockConfig();
    if (!config.pinEnabled) await secureSet(KEYS.appLock, "0");
  }
}

export async function authenticateNativeLock(): Promise<boolean> {
  if (!native()) return true;
  const config = await getNativeLockConfig();
  if (!config.appLock) return true;
  if (!config.biometricEnabled) return false;
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
  } catch {
    return false;
  }
}

export async function getNativeDeviceInfo() {
  if (!native()) return null;
  const [id, info] = await Promise.all([Device.getId(), Device.getInfo()]);
  return {
    deviceId: id.identifier,
    platform: info.platform,
    name: info.name || null,
    model: info.model || null,
    manufacturer: info.manufacturer || null,
    osVersion: info.osVersion || null,
    appVersion: "1.0.0",
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

export async function attachNativeResumeListener(onLocked: () => void) {
  if (!native()) return { remove: async () => {} };
  return App.addListener("appStateChange", async ({ isActive }) => {
    if (!isActive) return;
    const config = await getNativeLockConfig();
    if (config.appLock) onLocked();
    await registerNativeDeviceSession().catch(() => {});
  });
}
