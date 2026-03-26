"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";

function resolveInAppPath(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "ornabird:") return null;

    const hostPath = parsed.host ? `/${parsed.host}` : "";
    const path = `${hostPath}${parsed.pathname}${parsed.search}${parsed.hash}`;
    return path && path !== "/" ? path : "/dashboard";
  } catch {
    return null;
  }
}

function shouldOpenOutsideApp(anchor: HTMLAnchorElement) {
  if (!anchor.href) return false;
  if (anchor.target === "_blank") return true;
  if (anchor.rel?.includes("external")) return true;
  if (anchor.href.startsWith("mailto:") || anchor.href.startsWith("tel:")) return true;

  try {
    const targetUrl = new URL(anchor.href, window.location.origin);
    return targetUrl.origin !== window.location.origin;
  } catch {
    return false;
  }
}

export function NativeAppRuntime() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const platform = Capacitor.getPlatform();
    document.body.classList.add("native-app");
    document.body.classList.add(`native-${platform}`);

    const onClick = async (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (!shouldOpenOutsideApp(anchor)) return;

      event.preventDefault();
      await Browser.open({ url: anchor.href });
    };

    let backButtonHandle: { remove: () => Promise<void> } | null = null;
    let deepLinkHandle: { remove: () => Promise<void> } | null = null;

    document.addEventListener("click", onClick, true);

    void App.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack || window.history.length > 1) {
        window.history.back();
        return;
      }
      void App.minimizeApp();
    }).then((handle) => {
      backButtonHandle = handle;
    });

    void App.addListener("appUrlOpen", ({ url }) => {
      const targetPath = resolveInAppPath(url);
      if (!targetPath) return;
      window.location.assign(targetPath);
    }).then((handle) => {
      deepLinkHandle = handle;
    });

    return () => {
      document.removeEventListener("click", onClick, true);
      if (backButtonHandle) void backButtonHandle.remove();
      if (deepLinkHandle) void deepLinkHandle.remove();
      document.body.classList.remove("native-app");
      document.body.classList.remove(`native-${platform}`);
    };
  }, []);

  return null;
}
