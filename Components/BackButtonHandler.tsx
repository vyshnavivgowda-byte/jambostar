"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function BackButtonHandler() {
  const pathname = usePathname();

  useEffect(() => {
    let backListener: any = null;

    const setupListener = async () => {
      // Only run in the actual APK
      if (typeof window === "undefined" || !(window as any).Capacitor) return;

      try {
        const { App } = await import("@capacitor/app");
        
        // Remove old listeners to prevent the "Closing" bug
        await App.removeAllListeners();

        backListener = await App.addListener("backButton", (data: any) => {
          // Identify your 'Home' or 'Login' page
          const isAtRoot = pathname === "/login" || pathname === "/" || pathname.includes("/home");

          if (isAtRoot || !data.canGoBack) {
            // If we are on the login/home screen, close the app
            App.exitApp();
          } else {
            // If we are deep in the site, just go back one page
            window.history.back();
          }
        });
      } catch (e) {
        console.warn("Capacitor App plugin not found");
      }
    };

    setupListener();

    return () => {
      if (backListener) backListener.remove();
    };
  }, [pathname]);

  return null;
}