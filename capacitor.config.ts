import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.prashanthischool.app',
  appName: 'Prashanthi School',
  webDir: 'out',
  server: {
    // 1. Ensure no spaces in the URL
    url: 'https://prashanthi-school-6kow.vercel.app/login', 
    cleartext: true,
    // 2. THIS IS THE FIX: It tells the APK to stay inside the app for this domain
    allowNavigation: ['prashanthi-school-6kow.vercel.app']
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#ffffff",
      showSpinner: true,
      androidScaleType: "CENTER_CROP"
    }
  }
};
export default config;