import { createRoot } from 'react-dom/client';

import App from './App';
import { initLiveUpdates } from './liveUpdate';
import { initNativeNotifications } from './nativeNotifications';

import './index.css';

createRoot(document.getElementById('root')!).render(<App />);

// Offline app-shell caching is intentionally registered after the app mounts.
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('[RainX] offline shell unavailable', error);
    });
  }, { once: true });
}

// Native OTA updates are initialized after React mounts. On the web this is a no-op.
void initLiveUpdates().catch((error) => {
  console.warn('[RainX] live update bridge unavailable', error);
});

// Native push is initialized after React mounts. On the web this is a no-op.
void initNativeNotifications().catch((error) => {
  console.warn('[RainX] native notification bridge unavailable', error);
});
