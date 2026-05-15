"use client";

import { useRef, useState } from "react";
import { AlertTriangle, Download, Trash2, Upload } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type WipeStep = "idle" | "confirm" | "running";
type RestoreStep = "idle" | "running";

type FeedbackKind = "success" | "error" | "info";
type Feedback = { kind: FeedbackKind; message: string } | null;

function formatCounts(counts: Record<string, number>) {
  const total = Object.values(counts).reduce((acc, n) => acc + n, 0);
  const top = Object.entries(counts)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([k, n]) => `${k} (${n})`)
    .join(", ");
  return { total, top };
}

export function DangerZone() {
  const [downloading, setDownloading] = useState(false);
  const [wipeStep, setWipeStep] = useState<WipeStep>("idle");
  const [confirmText, setConfirmText] = useState("");
  const [restoreStep, setRestoreStep] = useState<RestoreStep>("idle");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function downloadBackup() {
    setDownloading(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/profile/backup", { cache: "no-store" });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error ?? "Falha ao gerar backup.");
      }
      const blob = await res.blob();
      const cd = res.headers.get("content-disposition") ?? "";
      const match = /filename="?([^"]+)"?/.exec(cd);
      const filename = match?.[1] ?? `ornabird-backup-${new Date().toISOString()}.json`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setFeedback({ kind: "success", message: `Backup '${filename}' baixado. Guarde em local seguro.` });
    } catch (err) {
      setFeedback({
        kind: "error",
        message: err instanceof Error ? err.message : "Falha ao baixar backup."
      });
    } finally {
      setDownloading(false);
    }
  }

  async function runRestore(file: File) {
    setRestoreStep("running");
    setFeedback(null);
    try {
      const text = await file.text();
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error("Arquivo nao eh um JSON valido.");
      }

      const res = await fetch("/api/profile/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json)
      });
      const payload = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        counts?: Record<string, number>;
        error?: string;
      };
      if (!res.ok || !payload.ok) {
        throw new Error(payload.error ?? "Falha ao restaurar backup.");
      }

      const summary = formatCounts(payload.counts ?? {});
      setFeedback({
        kind: "success",
        message: `Backup restaurado: ${summary.total} registros recriados. Atualize a pagina para ver os dados.`
      });
    } catch (err) {
      setFeedback({
        kind: "error",
        message: err instanceof Error ? err.message : "Falha ao restaurar backup."
      });
    } finally {
      setRestoreStep("idle");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function runWipe() {
    if (confirmText !== "APAGAR TUDO") {
      setFeedback({
        kind: "error",
        message: "Digite exatamente 'APAGAR TUDO' (sem aspas, maiusculas) para confirmar."
      });
      return;
    }
    setWipeStep("running");
    setFeedback(null);
    try {
      const res = await fetch("/api/profile/wipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: confirmText })
      });
      const payload = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        counts?: Record<string, number>;
        error?: string;
      };
      if (!res.ok || !payload.ok) {
        throw new Error(payload.error ?? "Falha ao apagar dados.");
      }
      const summary = formatCounts(payload.counts ?? {});
      setFeedback({
        kind: "success",
        message: `Sistema zerado: ${summary.total} registros apagados. Recarregue a pagina.`
      });
      setWipeStep("idle");
      setConfirmText("");
    } catch (err) {
      setFeedback({
        kind: "error",
        message: err instanceof Error ? err.message : "Falha ao apagar dados."
      });
      setWipeStep("confirm");
    }
  }

  return (
    <Card className="border-red-200 bg-red-50/40">
      <div className="flex items-center gap-2">
        <AlertTriangle className="size-5 text-red-600" />
        <h3 className="text-base font-semibold text-red-900">Zona perigosa</h3>
      </div>
      <p className="mt-2 text-sm text-red-900/80">
        Ferramentas para zerar o sistema. As acoes daqui afetam TODOS os dados operacionais,
        catalogos (especies/racas/variedades) e financeiro do criatorio. Funcionarios,
        assinatura e conta de login NAO sao afetados. Faca backup antes.
      </p>

      {feedback ? (
        <div
          className={
            "mt-4 rounded-xl border px-3 py-2 text-sm font-medium " +
            (feedback.kind === "success"
              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
              : feedback.kind === "error"
                ? "border-red-300 bg-red-100 text-red-800"
                : "border-amber-300 bg-amber-50 text-amber-800")
          }
        >
          {feedback.message}
        </div>
      ) : null}

      {/* 1. BAIXAR BACKUP */}
      <div className="mt-5 rounded-2xl border border-zinc-200 bg-white p-4">
        <div className="flex items-start gap-3">
          <Download className="mt-0.5 size-5 text-emerald-600" />
          <div className="flex-1">
            <p className="font-semibold text-zinc-900">1. Baixar backup completo</p>
            <p className="mt-1 text-xs text-zinc-600">
              Gera um arquivo JSON com TUDO do criatorio (plantel, coletas, vitrine, financeiro, sanidade, tasks). Guarde
              em local seguro — eh a unica forma de reverter.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={downloadBackup} disabled={downloading}>
            {downloading ? "Gerando..." : "Baixar backup"}
          </Button>
        </div>
      </div>

      {/* 2. RESTAURAR BACKUP */}
      <div className="mt-3 rounded-2xl border border-zinc-200 bg-white p-4">
        <div className="flex items-start gap-3">
          <Upload className="mt-0.5 size-5 text-sky-600" />
          <div className="flex-1">
            <p className="font-semibold text-zinc-900">2. Restaurar backup</p>
            <p className="mt-1 text-xs text-zinc-600">
              Substitui TODOS os dados atuais pelos do arquivo. Use caso tenha apagado por engano ou queira voltar a um
              estado anterior. So funciona com backup do MESMO criatorio.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                disabled={restoreStep !== "idle"}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const ok = window.confirm(
                    `Restaurar a partir de "${file.name}"? Todos os dados ATUAIS serao substituidos. Esta acao nao pode ser desfeita.`
                  );
                  if (!ok) {
                    if (fileInputRef.current) fileInputRef.current.value = "";
                    return;
                  }
                  void runRestore(file);
                }}
                className="block text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-sky-600 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white file:hover:bg-sky-700"
              />
              {restoreStep === "running" ? (
                <span className="text-xs text-sky-700">Restaurando... nao feche a pagina.</span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* 3. APAGAR TUDO */}
      <div className="mt-3 rounded-2xl border border-red-300 bg-red-50/60 p-4">
        <div className="flex items-start gap-3">
          <Trash2 className="mt-0.5 size-5 text-red-600" />
          <div className="flex-1">
            <p className="font-semibold text-red-900">3. Apagar todos os dados</p>
            <p className="mt-1 text-xs text-red-900/80">
              <strong>AVISO GRAVE:</strong> apaga plantel, coletas, vitrine, financeiro, sanidade, tasks, catalogos e
              todo o resto. O sistema fica completamente zerado. So da pra reverter restaurando um backup baixado antes.
            </p>

            {wipeStep === "idle" ? (
              <Button
                type="button"
                variant="danger"
                className="mt-3"
                onClick={() => {
                  setWipeStep("confirm");
                  setConfirmText("");
                  setFeedback(null);
                }}
              >
                Apagar todos os dados
              </Button>
            ) : (
              <div className="mt-3 rounded-xl border border-red-400 bg-white p-3">
                <p className="text-sm font-semibold text-red-900">Confirmacao final</p>
                <p className="mt-1 text-xs text-red-900/80">
                  Voce ja baixou o backup? Sem ele, NAO sera possivel reverter. Digite{" "}
                  <code className="rounded bg-red-100 px-1 font-mono text-red-900">APAGAR TUDO</code> abaixo para
                  liberar o botao.
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                  <Input
                    autoFocus
                    placeholder="Digite APAGAR TUDO"
                    value={confirmText}
                    onChange={(event) => setConfirmText(event.target.value)}
                    disabled={wipeStep === "running"}
                  />
                  <Button
                    type="button"
                    variant="danger"
                    disabled={confirmText !== "APAGAR TUDO" || wipeStep === "running"}
                    onClick={runWipe}
                  >
                    {wipeStep === "running" ? "Apagando..." : "Confirmar apagar"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={wipeStep === "running"}
                    onClick={() => {
                      setWipeStep("idle");
                      setConfirmText("");
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
