"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function BackButtonHandler() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let backListener: any = null;

    const setup = async () => {
      if (typeof window === "undefined") return;

      try {
        // @ts-ignore
        const { App } = await import("@capacitor/app");

        // fresh start
        await App.removeAllListeners();

        backListener = await App.addListener("backButton", (data: any) => {
          // 1. Define your "Root" pages (Home / Main Gallery)
          const isAtRoot = pathname === "/" || pathname === "/Wholesale/productgallery";

          // 2. Logic for exiting vs navigating back
          if (isAtRoot) {
            // If we are already on the main page, close the app
            App.exitApp();
          } else {
            // If we are on any other page (like product details), 
            // go back to the previous screen in your app
            window.history.back();
          }
        });
      } catch (err) {
        console.error("Capacitor BackButton Error:", err);
      }
    };

    setup();

    return () => {
      if (backListener) backListener.remove();
    };
  }, [pathname]); // This keeps the 'pathname' variable updated for the listener

  return null;
}