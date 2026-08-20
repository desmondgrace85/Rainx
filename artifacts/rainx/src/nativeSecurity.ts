import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Device } from "@capacitor/device";
import { BiometricAuth } from "@aparajita/capacitor-biometric-auth";
import { SecureStorage, KeychainAccess } from "@aparajita/capacitor-secure-storage";
import { supabase } from "./supabaseClient";

const PREFIX = "rainx_";
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
};

const native = () => Capacitor.isNativePlatform();

async function secureSet(key: string, value: string) {
  if (!native()) return;
  await SecureStorage.set(
    key,
    value,
    true,
    false,
    KeychainAccess.whenUnlockedThisDeviceOnly
  );
}

async function secureGet(key: string): Promise<string | null> {
  if (!native()) return null;
  try {
    return String(await SecureStorage.get(key));
  } catch {
    return null;
  }
}

async function secureRemove(key: string) {
  if (!native()) return;
  try {
    await SecureStorage.remove(key);
  } catch {
    // already absent
  }
}

export async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function getNativeLockConfig(
  accountId?: string
): Promise<NativeLockConfig> {
  if (!native()) {
    return {
      pinEnabled: false,
      appLock: false,
      biometricEnabled: false,
      pinLength: 6,
    };
  }

  const keys = keySet(accountId);

  let [pinEnabled, appLock, biometricEnabled, pinLength] =
    await Promise.all([
      secureGet(keys.pinEnabled),
      secureGet(keys.appLock),
      secureGet(keys.biometric),
      secureGet(keys.pinLength),
    ]);

  // Migrate the original device-scoped values to the account-scoped values.
  if (
    accountId &&
    pinEnabled === null &&
    appLock === null &&
    biometricEnabled === null
  ) {
    const legacy = await Promise.all([
      secureGet(LEGACY_KEYS.pinEnabled),
      secureGet(LEGACY_KEYS.appLock),
      secureGet(LEGACY_KEYS.biometric),
      secureGet(LEGACY_KEYS.pinLength),
    ]);

    if (legacy.some((value) => value !== null)) {
      [pinEnabled, appLock, biometricEnabled, pinLength] = legacy;

      if (legacy[0] !== null) await secureSet(keys.pinEnabled, legacy[0]);
      if (legacy[1] !== null) await secureSet(keys.appLock, legacy[1]);
      if (legacy[2] !== null) await secureSet(keys.biometric, legacy[2]);
      if (legacy[3] !== null) await secureSet(keys.pinLength, legacy[3]);

      await Promise.all(Object.values(LEGACY_KEYS).map(secureRemove));
    }
  }

  const parsedLength = Number(pinLength);

  return {
    pinEnabled: pinEnabled === "1",
    appLock: appLock === "1",
    biometricEnabled: biometricEnabled === "1",
    pinLength:
      parsedLength >= 4 && parsedLength <= 6 ? parsedLength : 6,
  };
}

export async function saveNativePin(pin: string, accountId?: string) {
  if (!native()) {
    throw new Error("PIN lock is available in the native app only.");
  }
  if (!/^\d{4,6}$/.test(pin)) {
    throw new Error("PIN must contain 4–6 digits.");
  }

  const keys = keySet(accountId);
  await secureSet(keys.pinHash, await sha256(pin));
  await secureSet(keys.pinLength, String(pin.length));
  await secureSet(keys.pinEnabled, "1");
  await secureSet(keys.appLock, "1");
}

/**
 * Verify against the current account-scoped key first, then the two legacy
 * locations used by older RainX builds. This is intentionally tolerant so a
 * user can still disable an old PIN after the storage migration.
 */
async function resolveAccountId(accountId?: string) {
  if (accountId) return accountId;
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id || undefined;
  } catch {
    return undefined;
  }
}

async function findMatchingPinKey(pin: string, accountId?: string) {
  const hash = await sha256(pin);
  const resolvedAccountId = await resolveAccountId(accountId);
  const candidates = [
    keySet(resolvedAccountId),
    keySet(accountId),
    keySet(),
    LEGACY_KEYS,
  ];

  for (const keys of candidates) {
    const stored = await secureGet(keys.pinHash);
    if (stored && stored === hash) return keys;
  }

  return null;
}

export async function verifyNativePin(
  pin: string,
  accountId?: string
): Promise<boolean> {
  if (!native()) return false;
  if (!/^\d{4,6}$/.test(pin)) return false;

  await getNativeLockConfig(accountId);
  return !!(await findMatchingPinKey(pin, accountId));
}

export async function disableNativePin(
  pin: string,
  accountId?: string
) {
  const matchingKeys = await findMatchingPinKey(pin, accountId);
  if (!matchingKeys) throw new Error("Incorrect PIN.");

  const resolvedAccountId = await resolveAccountId(accountId);

  // Remove every known location, not just the matching one. This clears old
  // device-scoped/legacy PIN state that could otherwise make the lock appear
  // to remain enabled after the user disables it.
  const allKeys = [
    keySet(resolvedAccountId),
    keySet(accountId),
    keySet(),
    LEGACY_KEYS,
  ];

  await Promise.all(
    allKeys.flatMap((keys) => [
      secureRemove(keys.pinHash),
      secureRemove(keys.pinLength),
      secureRemove(keys.pinEnabled),
      secureRemove(keys.appLock),
      secureRemove(keys.biometric),
    ])
  );
}

export async function setNativeAppLock(
  enabled: boolean,
  accountId?: string
) {
  const config = await getNativeLockConfig(accountId);

  if (enabled && !config.pinEnabled && !config.biometricEnabled) {
    throw new Error("Set up a PIN or device biometric first.");
  }

  await secureSet(
    keySet(accountId).appLock,
    enabled ? "1" : "0"
  );
}

export async function setNativeBiometricEnabled(
  enabled: boolean,
  accountId?: string
) {
  if (!native()) {
    throw new Error("Biometrics are available in the native app only.");
  }

  const keys = keySet(accountId);

  if (enabled) {
    const result = await BiometricAuth.checkBiometry();
    if (!result.isAvailable) {
      throw new Error(
        "No app-usable biometric authentication is enrolled on this device."
      );
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
    const config = await getNativeLockConfig(accountId);
    if (!config.pinEnabled) {
      await secureSet(keys.appLock, "0");
    }
  }
}

export async function authenticateNativeLock(
  accountId?: string
): Promise<boolean> {
  if (!native()) return true;

  const config = await getNativeLockConfig(accountId);
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

  const [id, info, app] = await Promise.all([
    Device.getId(),
    Device.getInfo(),
    App.getInfo(),
  ]);

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

export async function attachNativeResumeListener(
  onLocked: () => void,
  accountId?: string
) {
  if (!native()) return { remove: async () => {} };

  let wasBackgrounded = false;

  return App.addListener("appStateChange", async ({ isActive }) => {
    if (!isActive) {
      wasBackgrounded = true;
      return;
    }

    if (wasBackgrounded) {
      wasBackgrounded = false;
      const config = await getNativeLockConfig(accountId);
      if (config.appLock) onLocked();
    }

    await registerNativeDeviceSession().catch(() => {});
  });
}
