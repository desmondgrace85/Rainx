import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rainx.app',
  appName: 'RainX',
  webDir: 'dist/public',
  bundledWebRuntime: false,
  androidScheme: 'https',
  iosScheme: 'https',
  plugins: {
    App: { disableBackButtonHandler: true },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'banner', 'list'],
    },
  },
};

export default config;
