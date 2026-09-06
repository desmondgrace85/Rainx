import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rainx.app',
  appName: 'RainX',
  webDir: 'dist/public',
  bundledWebRuntime: false,
  androidScheme: 'https',
  iosScheme: 'https',
  plugins: {
    App: { disableBackButtonHandler: false },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'banner', 'list'],
    },
    LiveUpdate: {
      autoBlockRolledBackBundles: true,
      autoDeleteBundles: true,
      readyTimeout: 15000,
    },
  },
};

export default config;
