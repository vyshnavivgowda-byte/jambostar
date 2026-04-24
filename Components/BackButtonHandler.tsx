"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function BackButtonHandler() {
  const pathname = usePathname();

  useEffect(() => {
    let backListener: any = null;

    const setup = async () => {
      // 1. Double check environment
      if (typeof window === "undefined" || !(window as any).Capacitor) return;

      try {
        // @ts-ignore
        const { App } = await import("@capacitor/app");

        // Clear any stuck listeners
        await App.removeAllListeners();

        backListener = await App.addListener("backButton", () => {
          /**
           * HISTORY LOGIC: 
           * window.history.length > 1 means there are pages to go back to.
           * !pathname.includes("/home") ensures we don't try to go back from the landing page.
           */
          const canGoBackInApp = window.history.length > 1;
          const isAtHome = pathname === "/" || pathname.includes("/home") || pathname.includes("/Wholesale/home");

          if (isAtHome || !canGoBackInApp) {
            // Exit if at home or no history
            App.exitApp();
          } else {
            // Go back in history
            window.history.back();
          }
        });
      } catch (err) {
        console.error("Back handler error:", err);
      }
    };

    setup();

    return () => {
      if (backListener) backListener.remove();
    };
  }, [pathname]);

  return null;
}