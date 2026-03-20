"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function EmployeeLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch("/api/equipe/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string; redirectTo?: string };
    setLoading(false);

    if (!response.ok || !payload.redirectTo) {
      setError(payload.error ?? "Não foi possível entrar com este acesso.");
      return;
    }

    router.push(payload.redirectTo);
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_#ecfeff,_#f8f6f2_50%)] p-4">
      <Card className="w-full max-w-md p-6">
        <div className="flex items-center gap-3">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--brand),var(--brand-strong))] text-2xl text-white shadow-[0_16px_34px_rgba(15,157,138,0.28)]">
            ?????
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Acesso da equipe</h1>
            <p className="mt-1 text-sm text-zinc-500">Login do funcionário para lançar dados do sítio.</p>
          </div>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="E-mail do funcionário" />
          <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Senha" />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button className="w-full" type="submit" disabled={loading}>
            {loading ? "Entrando..." : "Entrar na equipe"}
          </Button>
        </form>

        <div className="mt-4 rounded-2xl bg-[color:var(--surface-soft)] p-4 text-sm text-slate-600">
          Este acesso não entra no financeiro nem na assinatura. Ele serve apenas para os módulos liberados pelo titular.
        </div>

        <p className="mt-4 text-sm text-zinc-500">
          Você é o titular da conta?{" "}
          <Link href="/login" className="font-semibold text-[#0f766e] hover:underline">
            Entrar como administrador
          </Link>
        </p>
      </Card>
    </main>
  );
}
