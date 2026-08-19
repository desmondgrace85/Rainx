import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { PushNotifications, type Token } from '@capacitor/push-notifications';
import { supabase } from './supabaseClient';

const TOKEN_KEY = 'rainx-native-push-token';
const APP_ID = 'com.rainx.app';

function platform(): 'android' | 'ios' | null {
  const p = Capacitor.getPlatform();
  return p === 'android' || p === 'ios' ? p : null;
}

function deviceName() {
  try { return navigator.userAgent.slice(0, 240); } catch { return undefined; }
}

async function removeLegacyWebPush() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map(async (registration) => {
      try {
        const subscription = await registration.pushManager?.getSubscription?.();
        if (subscription) await subscription.unsubscribe().catch(() => {});
      } catch {}
      await registration.unregister().catch(() => {});
    }));
  } catch (error) {
    console.warn('[RainX] legacy web-push cleanup failed', error);
  }
}

async function registerToken(token: Token, accessToken: string, userId: string) {
  const p = platform();
  if (!p || !token?.value || !accessToken || !userId) return false;

  localStorage.setItem(TOKEN_KEY, token.value);

  const response = await fetch('/api/push/native/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      platform: p,
      token: token.value,
      appId: APP_ID,
      deviceName: deviceName(),
      appVersion: '1.0.0',
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Native push registration failed (${response.status})${detail ? `: ${detail}` : ''}`);
  }

  return true;
}

async function registerCurrentSession() {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session?.user?.id || !session.access_token) return;

  const permission = await PushNotifications.checkPermissions();
  let receive = permission.receive;

  if (receive === 'prompt') {
    receive = (await PushNotifications.requestPermissions()).receive;
  }

  if (receive !== 'granted') {
    console.warn('[RainX] notification permission is not granted:', receive);
    return;
  }

  if (Capacitor.getPlatform() === 'android') {
    await PushNotifications.createChannel({
      id: 'rainx_default',
      name: 'RainX notifications',
      description: 'RainX messages, community activity and trading alerts',
      importance: 5,
      visibility: 1,
      sound: 'default',
      vibration: true,
    }).catch((error) => console.warn('[RainX] notification channel failed', error));
  }

  await PushNotifications.register();
}

export async function initNativeNotifications() {
  if (!Capacitor.isNativePlatform()) return () => {};

  // Native RainX must never keep the old browser Push/VAPID worker alive.
  await removeLegacyWebPush();

  const listeners = await Promise.all([
    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack && window.history.length > 1) window.history.back();
      else void App.exitApp();
    }),
    App.addListener('appUrlOpen', ({ url }) => {
      try {
        const parsed = new URL(url);
        const target = parsed.search || parsed.hash
          ? `${parsed.pathname}${parsed.search}${parsed.hash}`
          : '/';
        window.history.replaceState({}, '', target);
        window.dispatchEvent(new PopStateEvent('popstate'));
      } catch {}
    }),
    PushNotifications.addListener('registration', async (token) => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user?.id && data.session.access_token) {
          await registerToken(token, data.session.access_token, data.session.user.id);
        } else {
          // Auth may finish a moment after FCM registration. The auth listener
          // below will call register() again and persist this token.
          console.warn('[RainX] FCM token received before auth session');
        }
      } catch (error) {
        console.error('[RainX] FCM token registration failed', error);
      }
    }),
    PushNotifications.addListener('registrationError', (error) => {
      console.error('[RainX] native push registration failed', error);
    }),
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      window.dispatchEvent(new CustomEvent('rainx:native-push-received', { detail: notification }));
    }),
    PushNotifications.addListener('pushNotificationActionPerformed', (event) => {
      const data = event.notification?.data || {};
      const target = data.url || data.postId
        ? String(data.url || `/?rainxTarget=post&postId=${encodeURIComponent(data.postId)}`)
        : '/';
      window.dispatchEvent(new CustomEvent('rainx:native-push-open', { detail: { ...data, url: target } }));
      try {
        const url = new URL(target, window.location.origin);
        window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
        window.dispatchEvent(new PopStateEvent('popstate'));
      } catch {}
    }),
  ]);

  const authSub = supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user?.id) {
      setTimeout(() => { void registerCurrentSession(); }, 250);
    }
  });

  await registerCurrentSession();

  return async () => {
    authSub.data.subscription.unsubscribe();
    for (const listener of listeners) await listener.remove();
  };
}
