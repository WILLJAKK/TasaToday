import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tasatoday.app',
  appName: 'TasaToday',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
