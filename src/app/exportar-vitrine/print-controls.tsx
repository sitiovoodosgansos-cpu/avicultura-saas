"use client";

import { useEffect } from "react";

/**
 * Botoes flutuantes no canto superior direito: 'Imprimir / Salvar como
 * PDF' e 'Voltar'. Ocultos durante a impressao (Tailwind 'print:hidden')
 * pra nao poluir o PDF gerado. Tambem dispara window.print() automatico
 * apos 600ms — tempo suficiente pra fontes e logo carregarem.
 */
export function PrintControls() {
  useEffect(() => {
    // Auto-trigger print apos um pequeno delay (logo + imagens precisam
    // carregar; tambem evita print disparar antes do render completo)
    const timer = setTimeout(() => {
      window.print();
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed right-4 top-4 z-50 flex gap-2 print:hidden">
      <button
        type="button"
        onClick={() => window.print()}
        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-emerald-700"
      >
        🖨️ Imprimir / Salvar PDF
      </button>
      <button
        type="button"
        onClick={() => window.close()}
        className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-lg transition hover:bg-slate-50"
      >
        Fechar
      </button>
    </div>
  );
}
