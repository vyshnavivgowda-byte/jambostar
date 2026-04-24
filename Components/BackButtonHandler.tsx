"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function BackButtonHandler() {
  const pathname = usePathname();

  useEffect(() => {
    let backListener: any = null;

    const setup = async () => {
      if (typeof window === "undefined" || !(window as any).Capacitor) return;

      try {
        // @ts-ignore
        const { App } = await import("@capacitor/app");

        await App.removeAllListeners();

        backListener = await App.addListener("backButton", (data: any) => {
          // LOGIC: Check if we are on the Home page
          // Since your server URL starts at /Wholesale/home, 
          // this is your "Bottom" level.
          const isAtHome = pathname.includes("/Wholesale/home");

          if (isAtHome || !data.canGoBack) {
            // If on home or no history, close the app
            App.exitApp();
          } else {
            // Otherwise, go back one page
            window.history.back();
          }
        });
      } catch (err) {
        console.error("Back button setup failed:", err);
      }
    };

    setup();

    return () => {
      if (backListener) backListener.remove();
    };
  }, [pathname]);

  return null;
}