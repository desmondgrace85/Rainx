import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { PushNotifications, type Token } from '@capacitor/push-notifications';
import { supabase } from './supabaseClient';

const API_BASE = (import.meta.env.BASE_URL || '').replace(/\/$/, '');
const TOKEN_KEY = 'rainx-native-push-token';

function platform(): 'android' | 'ios' | null {
  const p = Capacitor.getPlatform();
  return p === 'android' || p === 'ios' ? p : null;
}

function deviceName() {
  try {
    return navigator.userAgent.slice(0, 240);
  } catch {
    return undefined;
  }
}

async function registerToken(token: Token, accessToken: string, userId: string) {
  const p = platform();
  if (!p || !token?.value) return;
  localStorage.setItem(TOKEN_KEY, token.value);
  await fetch(`${API_BASE}/api/push/native/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      platform: p,
      token: token.value,
      appId: 'com.rainx.app',
      deviceName: deviceName(),
      osVersion: navigator.userAgent,
      appVersion: '1.0.0',
    }),
  }).catch(() => {});

  try { localStorage.setItem(`rainx-native-push-user:${userId}`, token.value); } catch {}
}

export async function initNativeNotifications() {
  if (!Capacitor.isNativePlatform()) return () => {};

  const listeners = await Promise.all([
    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack && window.history.length > 1) window.history.back();
      else void App.exitApp();
    }),
    App.addListener('appUrlOpen', ({ url }) => {
      try {
        const parsed = new URL(url);
        const target = parsed.search || parsed.hash ? `${parsed.pathname}${parsed.search}${parsed.hash}` : '/';
        window.history.replaceState({}, '', target);
        window.dispatchEvent(new PopStateEvent('popstate'));
      } catch {}
    }),
    PushNotifications.addListener('registration', async (token) => {
      try {
        const { data } = await supabase.auth.getSession();
        const session = data.session;
        if (session?.user?.id && session.access_token) {
          await registerToken(token, session.access_token, session.user.id);
        }
      } catch (error) {
        console.warn('[RainX] native push token registration failed', error);
      }
    }),
    PushNotifications.addListener('registrationError', (error) => {
      console.warn('[RainX] native push registration failed', error);
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
      if (target) {
        try {
          const url = new URL(target, window.location.origin);
          window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
          window.dispatchEvent(new PopStateEvent('popstate'));
        } catch {}
      }
    }),
  ]);

  const requestAndRegister = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session?.user?.id) return;

      const permissions = await PushNotifications.checkPermissions();
      let receive = permissions.receive;
      if (receive === 'prompt') {
        receive = (await PushNotifications.requestPermissions()).receive;
      }
      if (receive !== 'granted') return;

      if (Capacitor.getPlatform() === 'android') {
        await PushNotifications.createChannel({
          id: 'rainx_default',
          name: 'RainX notifications',
          description: 'RainX community, messages and trading alerts',
          importance: 5,
          visibility: 1,
          sound: 'default',
          vibration: true,
        }).catch(() => {});
      }

      await PushNotifications.register();
    } catch (error) {
      // Push must never be allowed to crash or blank the RainX app.
      console.warn('[RainX] native push initialization skipped', error);
    }
  };

  const authSub = supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user?.id) {
      setTimeout(() => { void requestAndRegister(); }, 0);
    }
  });

  await requestAndRegister();

  return async () => {
    authSub.data.subscription.unsubscribe();
    for (const listener of listeners) await listener.remove();
  };
}
