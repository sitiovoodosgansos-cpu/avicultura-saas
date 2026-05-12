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

// Pre-abre uma aba/janela em branco no click event do user e retorna uma
// handle. Usa pra evitar popup blocker quando se quer abrir URL externa
// depois de uma chamada async (fetch).
//
// Padrao de uso:
//   const tab = preOpenBlankTab();
//   const url = await fetchTheUrl();
//   completeOpenInTab(tab, url);
//
// No native (Capacitor) retorna null e o caller deve cair em Browser.open
// quando tiver a URL.
export function preOpenBlankTab(): Window | null {
  if (typeof window === "undefined") return null;
  if (Capacitor.isNativePlatform()) return null;
  try {
    return window.open("about:blank", "_blank", "noopener,noreferrer");
  } catch {
    return null;
  }
}

// Completa a abertura: seta a URL na aba pre-aberta, OU, se a pre-abertura
// falhou (popup blocker / native), abre via Browser.open (native) ou
// window.open (web fallback).
export async function completeOpenInTab(
  tab: Window | null,
  url: string
): Promise<void> {
  if (typeof window === "undefined") return;
  const parsed = normalizeUrl(url);
  const finalUrl = parsed?.toString() ?? url;

  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url: finalUrl });
    return;
  }

  if (tab && !tab.closed) {
    try {
      tab.location.href = finalUrl;
      return;
    } catch {
      // alguns navegadores quebram o handle cross-origin — cai no fallback
    }
  }

  // Fallback: tenta abrir agora (pode dar popup blocker, mas e a ultima
  // chance — se bloquear, ao menos o navegador vai mostrar o icone na barra)
  const fallback = window.open(finalUrl, "_blank", "noopener,noreferrer");
  if (!fallback) {
    // Ultima saida: redireciona a janela atual mesmo (pior UX mas funciona)
    window.location.href = finalUrl;
  }
}

