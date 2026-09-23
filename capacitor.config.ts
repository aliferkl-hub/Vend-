import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vendplus.app',
  appName: 'VEND+',
  webDir: 'dist',
  server: {
    // Official production backend URL for VEND+ mobile apps
    url: 'https://ais-dev-dlywvp6nlon2r555ruj6g3-419803088019.us-east1.run.app',
    cleartext: true,
    androidScheme: 'https',
    allowNavigation: [
      'ais-dev-dlywvp6nlon2r555ruj6g3-419803088019.us-east1.run.app',
      'ais-pre-dlywvp6nlon2r555ruj6g3-419803088019.us-east1.run.app',
      '*.mercadopago.com',
      '*.mercadopago.com.br',
      '*.google.com',
      '*.firebaseapp.com'
    ]
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    backgroundColor: '#020617'
  },
  ios: {
    contentInset: 'always',
    allowsLinkPreview: false,
    scrollEnabled: true,
    backgroundColor: '#020617'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#020617',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false
    }
  }
};

export default config;
