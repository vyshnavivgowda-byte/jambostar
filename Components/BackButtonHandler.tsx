"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function BackButtonHandler() {
  const pathname = usePathname();

  useEffect(() => {
    let backListener: any = null;

    const setupListener = async () => {
      try {
        // @ts-ignore
        const { App } = await import("@capacitor/app");

        // Remove existing to avoid multiple triggers
        if (backListener) {
          await backListener.remove();
        }

        backListener = await App.addListener("backButton", (data: { canGoBack: boolean }) => {
          console.log("Back button pressed. Path:", pathname, "Can Go Back:", data.canGoBack);

          /**
           * CRITICAL: Define your exit routes here.
           * If the user is on one of these paths, the app will CLOSE.
           */
          const isAppRoot = pathname === "/" || pathname === "/home" || pathname === "/Wholesale/productgallery";

          if (isAppRoot || !data.canGoBack) {
            // No more history or on a root page -> CLOSE APP
            App.exitApp();
          } else {
            // Has history -> GO BACK
            window.history.back();
          }
        });
      } catch (e) {
        console.warn("Capacitor App plugin not available.");
      }
    };

    setupListener();

    // Cleanup on unmount
    return () => {
      if (backListener) {
        backListener.remove();
      }
    };
  }, [pathname]); // Updates whenever you change pages

  return null;
}