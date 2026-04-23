"use client";

import { useEffect } from "react";

export default function BackButtonHandler() {
  useEffect(() => {
    let appPlugin: any = null;

    const setupListener = async () => {
      try {
        // 1. Dynamic import: This hides the module from the server-side bundler
        const { App } = await import("@capacitor/app");
        appPlugin = App;

        await App.addListener("backButton", ({ canGoBack }) => {
          if (canGoBack) {
            window.history.back();
          } else {
            App.exitApp();
          }
        });
      } catch (e) {
        console.log("Capacitor App plugin not available in this environment.");
      }
    };

    setupListener();

    return () => {
      // 2. Safely remove listeners if the plugin was loaded
      if (appPlugin) {
        appPlugin.removeAllListeners();
      }
    };
  }, []);

  return null;
}