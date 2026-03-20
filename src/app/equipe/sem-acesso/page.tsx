import Link from "next/link";
import { Card } from "@/components/ui/card";

export default function SemAcessoPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_#ecfeff,_#f8f6f2_50%)] p-4">
      <Card className="w-full max-w-xl p-8 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-3xl bg-amber-100 text-3xl">??</div>
        <h1 className="mt-5 text-2xl font-semibold text-slate-900">Acesso sem módulos liberados</h1>
        <p className="mt-3 text-sm text-slate-600">
          Este usuário da equipe ainda não recebeu permissão para usar nenhuma área do sistema. Peça ao titular da conta para liberar pelo menos um módulo.
        </p>
        <Link href="/equipe/login" className="mt-6 inline-flex rounded-2xl border border-[color:var(--line)] px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          Voltar para o login da equipe
        </Link>
      </Card>
    </main>
  );
}
