import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jumbostar.wholesale',
  appName: 'Jumbo Star',
  webDir: 'out', // Capacitor requires this, but 'server.url' takes priority
  server: {
    // This connects the app directly to your live website
    url: ' https://jambostar.vercel.app/Wholesale/home', 
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#0a0a0b", // Matches your premium dark footer color
      showSpinner: true,
      androidScaleType: "CENTER_CROP"
    }
  }
};

export default config;