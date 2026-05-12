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
// IMPORTANTE: NAO usar "noopener" aqui — segundo a spec do HTML, quando
// window.open eh chamado com noopener, ele retorna null. A gente PRECISA
// do handle pra setar location.href depois. Como a URL eh pra um gateway
// de pagamento (Asaas), o risco de tabnabbing eh baixo. Se um dia rolar,
// dah pra mitigar setando rel="noopener" no link OU adicionando
// `newTab.opener = null` apos abrir.
//
// No native (Capacitor) retorna null e o caller deve cair em Browser.open
// quando tiver a URL.
export function preOpenBlankTab(): Window | null {
  if (typeof window === "undefined") return null;
  if (Capacitor.isNativePlatform()) return null;
  try {
    return window.open("about:blank", "_blank");
  } catch {
    return null;
  }
}

// Completa a abertura: seta a URL na aba pre-aberta, OU, se a pre-abertura
// falhou (popup blocker / native), abre via Browser.open (native) ou
// window.open (web). Lanca Error se nao conseguir abrir — caller decide
// como avisar o user (NUNCA redireciona a janela atual sozinho, pq isso
// confunde: o user clicou esperando nova aba).
export async function completeOpenInTab(tab: Window | null, url: string): Promise<void> {
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
      // Cross-origin / handle invalido — cai no fallback
      try {
        tab.close();
      } catch {
        // ignora
      }
    }
  }

  // Fallback: tenta abrir agora. Sem noopener pra garantir que retorne
  // handle (pra detectar bloqueio).
  const fallback = window.open(finalUrl, "_blank");
  if (!fallback) {
    // Popup bloqueado. Lanca erro pro caller mostrar mensagem amigavel.
    // NAO redireciona a janela atual sozinho — confunde o user que
    // clicou esperando uma nova aba.
    throw new Error(
      "Não foi possível abrir a fatura automaticamente — o navegador bloqueou. Permita popups em ornabird.app nas configurações do navegador e tente de novo."
    );
  }
}

