"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function BackButtonHandler() {
  const pathname = usePathname();

  useEffect(() => {
    // Variable to hold the listener cleanup function
    let backListener: any = null;

    const initialize = async () => {
      // 1. Check if we are actually in the APK (Native environment)
      if (typeof window === "undefined" || !(window as any).Capacitor) return;

      try {
        // Use a standard import inside the effect
        const { App } = await import("@capacitor/app");

        // 2. Clear any old listeners to prevent "Ghost" clicks
        await App.removeAllListeners();

        // 3. Set the new hardware listener
        backListener = await App.addListener("backButton", (data: { canGoBack: boolean }) => {
          
          // Define the exact pages where back button should CLOSE the app
          const isAtRoot = pathname === "/" || pathname === "/home" || pathname === "/Wholesale/productgallery";

          if (isAtRoot || !data.canGoBack) {
            // This forces the Android Activity to finish
            App.exitApp();
          } else {
            // Otherwise, navigate back in the Next.js stack
            window.history.back();
          }
        });
      } catch (err) {
        console.error("Capacitor Bridge Error:", err);
      }
    };

    initialize();

    return () => {
      if (backListener) backListener.remove();
    };
  }, [pathname]); // Vital: Re-binds the logic when the route changes

  return null;
}