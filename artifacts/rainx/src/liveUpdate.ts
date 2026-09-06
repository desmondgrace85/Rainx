import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { LiveUpdate } from '@capawesome/capacitor-live-update';

const UPDATE_MANIFEST_URL =
  'https://raw.githubusercontent.com/Buildrco/Rainx/ota/update.json';
const RELEASE_URL_PREFIX =
  'https://github.com/Buildrco/Rainx/releases/download/ota-';

interface UpdateManifest {
  bundleId: string;
  url: string;
  checksum?: string;
}

let updateCheck: Promise<void> | null = null;

async function checkForUpdate(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  if (updateCheck) return updateCheck;

  updateCheck = (async () => {
    const response = await fetch(UPDATE_MANIFEST_URL + '?t=' + Date.now(), {
      cache: 'no-store',
    });
    if (!response.ok) return;

    const manifest = (await response.json()) as Partial<UpdateManifest>;
    if (!manifest.bundleId || !/^[a-f0-9]{40}$/.test(manifest.bundleId)) return;
    if (!manifest.url?.startsWith(RELEASE_URL_PREFIX)) return;
    if (manifest.checksum && !/^[a-f0-9]{64}$/.test(manifest.checksum)) return;

    const [{ bundleId: currentBundleId }, { bundleId: nextBundleId }] =
      await Promise.all([
        LiveUpdate.getCurrentBundle(),
        LiveUpdate.getNextBundle(),
      ]);
    if (currentBundleId === manifest.bundleId || nextBundleId === manifest.bundleId) {
      return;
    }

    await LiveUpdate.downloadBundle({
      bundleId: manifest.bundleId,
      url: manifest.url,
      ...(manifest.checksum ? { checksum: manifest.checksum } : {}),
    });
    await LiveUpdate.setNextBundle({ bundleId: manifest.bundleId });
    await LiveUpdate.reload();
  })().catch((error) => {
    console.warn('[RainX] OTA update unavailable', error);
  }).finally(() => {
    updateCheck = null;
  });

  return updateCheck;
}

export async function initLiveUpdates(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await LiveUpdate.ready();
  } catch (error) {
    console.warn('[RainX] OTA readiness check failed', error);
  }

  await checkForUpdate();
  await App.addListener('appStateChange', ({ isActive }) => {
    if (isActive) void checkForUpdate();
  });
}
