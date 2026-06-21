import type { CapacitorConfig } from '@capacitor/cli'

// Native shell (iOS + Android) for PropSync. Loads the live web app inside a
// native WebView and exposes native plugins (camera, push, etc). The web app
// detects the native context via window.Capacitor (see web repo lib/native.ts).
const config: CapacitorConfig = {
  appId: 'com.propsyncia.app',
  appName: 'PropSync',
  // No local web bundle — we load the production site directly.
  webDir: 'www',
  server: {
    url: 'https://www.propsyncia.com',
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#0f0f1a',
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
  ios: {
    contentInset: 'always',
  },
  android: {
    allowMixedContent: false,
  },
}

export default config
