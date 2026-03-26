"use client";

import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";

function normalizeUrl(url: string) {
  try {
    return new URL(url, window.location.origin);
  } catch {
    return null;
  }
}

export async function openUrlWithNativeFallback(url: string) {
  if (typeof window === "undefined") return;

  const parsed = normalizeUrl(url);
  const finalUrl = parsed?.toString() ?? url;

  if (Capacitor.isNativePlatform() && parsed && parsed.origin !== window.location.origin) {
    await Browser.open({ url: finalUrl });
    return;
  }

  window.location.href = finalUrl;
}

