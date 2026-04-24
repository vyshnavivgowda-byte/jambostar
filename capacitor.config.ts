import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jumbostar.wholesale',
  appName: 'Jumbo Star',
  webDir: 'out',
  server: {
    // Note: Removed the extra space before 'https'
    url: 'https://jambostar.vercel.app/Wholesale/home', 
    cleartext: true
  },
  android: {
    // Allows you to inspect the app via chrome://inspect
    webContentsDebuggingEnabled: true 
  },
  plugins: {
    App: {
      // Keep this false so our JavaScript code can handle the exit logic
      disableBackButtonHandler: false 
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#0a0a0b",
      showSpinner: true,
      androidScaleType: "CENTER_CROP"
    }
  }
};

export default config;