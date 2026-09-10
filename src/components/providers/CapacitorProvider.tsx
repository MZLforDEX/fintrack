"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

export function CapacitorProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // Only run Capacitor native logic on client
    let removeListener: (() => void) | undefined;

    async function initNativeFeatures() {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;

        // 1. Status Bar Setup
        try {
          const { StatusBar, Style } = await import("@capacitor/status-bar");
          await StatusBar.setStyle({ style: Style.Dark });
          await StatusBar.setBackgroundColor({ color: "#0f172a" });
        } catch (e) {
          console.debug("StatusBar plugin error:", e);
        }

        // 2. Hide Splash Screen after React hydrates
        try {
          const { SplashScreen } = await import("@capacitor/splash-screen");
          await SplashScreen.hide();
        } catch (e) {
          console.debug("SplashScreen plugin error:", e);
        }

        // 3. Android Hardware Back Button Listener
        try {
          const { App: CapApp } = await import("@capacitor/app");
          const listener = await CapApp.addListener("backButton", ({ canGoBack }) => {
            // A. Check if any open modal/dialog exists and close it
            const openDialogCloseBtn = document.querySelector<HTMLButtonElement>(
              '[role="dialog"] button[aria-label="Close"], [data-state="open"] button'
            );
            if (openDialogCloseBtn) {
              openDialogCloseBtn.click();
              return;
            }

            // B. If not on home page, navigate back or to home
            if (window.location.pathname !== "/" && window.location.pathname !== "") {
              if (canGoBack) {
                window.history.back();
              } else {
                router.push("/");
              }
              return;
            }

            // C. If already at home, exit the application
            CapApp.exitApp();
          });

          removeListener = () => {
            listener.remove();
          };
        } catch (e) {
          console.debug("CapApp listener error:", e);
        }
      } catch (err) {
        console.debug("Capacitor initialization skipped:", err);
      }
    }

    initNativeFeatures();

    return () => {
      if (removeListener) removeListener();
    };
  }, [pathname, router]);

  return <>{children}</>;
}
