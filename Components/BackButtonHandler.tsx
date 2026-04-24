"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function BackButtonHandler() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let listener: any = null;

    const setup = async () => {
      try {
        // @ts-ignore
        const { App } = await import("@capacitor/app");

        // Remove any existing listeners to prevent duplicates
        await App.removeAllListeners();

        listener = await App.addListener("backButton", (data: any) => {
          // Logic: If we are at the root/home page, exit the app
          // Otherwise, go back in history
          if (pathname === "/" || pathname === "/home" || !data.canGoBack) {
            App.exitApp();
          } else {
            window.history.back();
          }
        });
      } catch (error) {
        console.warn("Capacitor App plugin not found:", error);
      }
    };

    setup();

    return () => {
      if (listener) {
        listener.remove();
      }
    };
  }, [pathname]); // Re-run when path changes to ensure 'pathname' logic stays fresh

  return null;
}