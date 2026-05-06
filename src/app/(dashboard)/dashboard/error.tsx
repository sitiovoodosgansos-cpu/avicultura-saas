"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard.error.boundary]", error.message, error.stack, "digest:", error.digest);
  }, [error]);

  return (
    <main className="space-y-4 p-6">
      <h1 className="text-xl font-semibold text-rose-700">Erro no dashboard</h1>
      <p className="text-sm text-slate-700">
        <strong>Mensagem:</strong> {error.message || "(sem mensagem)"}
      </p>
      <p className="text-xs text-slate-500">Digest: {error.digest ?? "(none)"}</p>
      {error.stack ? (
        <pre className="max-w-full overflow-x-auto rounded-xl bg-slate-50 p-4 text-[11px] text-slate-700">
          {error.stack}
        </pre>
      ) : null}
      <button
        type="button"
        onClick={reset}
        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
      >
        Tentar novamente
      </button>
    </main>
  );
}
