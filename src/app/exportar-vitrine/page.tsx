import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";
import { loadVitrineExportData } from "@/lib/vitrine/export-data";
import { PrintControls } from "./print-controls";

export const metadata = {
  title: "Lista de aves disponíveis - Ornabird"
};

// Sempre dinamico: dados atuais a cada print
export const dynamic = "force-dynamic";

function formatBRL(value: number | null) {
  if (value === null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatAge(months: number) {
  if (months <= 0) return "Recém-nascido";
  if (months === 1) return "1 mês";
  if (months < 12) return `${months} meses`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (rest === 0) return years === 1 ? "1 ano" : `${years} anos`;
  return `${years}a ${rest}m`;
}

function formatDateBR(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

export default async function ExportarVitrinePage() {
  const session = await getCurrentSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const data = await loadVitrineExportData(session.user.tenantId);
  const { tenant, rows, totals, generatedAt } = data;

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <PrintControls />

      <div className="mx-auto max-w-4xl px-8 py-10 print:px-6 print:py-6">
        {/* ============ CABEÇALHO ============ */}
        <header className="border-b-2 border-emerald-600 pb-5">
          <div className="flex items-start justify-between gap-6">
            <div className="flex items-start gap-4">
              {tenant.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={tenant.logoUrl}
                  alt={tenant.name}
                  className="h-20 w-20 rounded-2xl border border-slate-200 object-contain"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-100 text-3xl">
                  🐔
                </div>
              )}
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                  Lista de aves disponíveis
                </p>
                <h1 className="mt-1 text-2xl font-bold leading-tight text-slate-900">
                  {tenant.name}
                </h1>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                  {tenant.phone ? (
                    <span className="inline-flex items-center gap-1">
                      <span aria-hidden>📞</span>
                      {tenant.phone}
                    </span>
                  ) : null}
                  {tenant.whatsapp && tenant.whatsapp !== tenant.phone ? (
                    <span className="inline-flex items-center gap-1">
                      <span aria-hidden>💬</span>
                      {tenant.whatsapp}
                    </span>
                  ) : null}
                  {tenant.email ? (
                    <span className="inline-flex items-center gap-1">
                      <span aria-hidden>✉️</span>
                      {tenant.email}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">
                Atualizada em
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-700">
                {formatDateBR(generatedAt)}
              </p>
            </div>
          </div>
        </header>

        {/* ============ RESUMO ============ */}
        <section className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-700">
              Total de aves disponíveis
            </p>
            <p className="mt-1 text-2xl font-bold text-emerald-900">{totals.aves}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">
              Valor total estimado
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{formatBRL(totals.valor)}</p>
          </div>
        </section>

        {/* ============ TABELA ============ */}
        {rows.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-300 p-10 text-center">
            <p className="text-4xl">🪺</p>
            <p className="mt-3 text-sm font-semibold text-slate-700">
              Nenhuma ave disponível no momento
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Cadastre lotes na Vitrine para aparecerem aqui.
            </p>
          </div>
        ) : (
          <section className="mt-6">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-slate-300 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-600">
                  <th className="py-3 pr-3">Raça / Espécie</th>
                  <th className="py-3 px-2">Idade</th>
                  <th className="py-3 px-2 text-center">♀ Fêmeas</th>
                  <th className="py-3 px-2 text-center">♂ Machos</th>
                  <th className="py-3 px-2 text-center">? Indef.</th>
                  <th className="py-3 px-2 text-center">Total</th>
                  <th className="py-3 pl-2 text-right">Preço un.</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr
                    key={`${row.raceTitle}-${row.ageInMonths}-${idx}`}
                    className="border-b border-slate-100"
                  >
                    <td className="py-3 pr-3 font-semibold text-slate-900">
                      {row.raceTitle}
                    </td>
                    <td className="py-3 px-2 text-slate-700">{formatAge(row.ageInMonths)}</td>
                    <td className="py-3 px-2 text-center">
                      {row.female > 0 ? (
                        <span className="font-semibold text-rose-700">{row.female}</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-center">
                      {row.male > 0 ? (
                        <span className="font-semibold text-sky-700">{row.male}</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-center">
                      {row.unknown > 0 ? (
                        <span className="font-semibold text-slate-500">{row.unknown}</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-center font-semibold text-slate-900">
                      {row.total}
                    </td>
                    <td className="py-3 pl-2 text-right font-semibold text-emerald-700">
                      {formatBRL(row.pricePerUnit)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300 text-sm font-bold">
                  <td colSpan={5} className="py-3 pr-3 text-right text-slate-500">
                    Totais:
                  </td>
                  <td className="py-3 px-2 text-center text-slate-900">{totals.aves}</td>
                  <td className="py-3 pl-2 text-right text-emerald-700">
                    {formatBRL(totals.valor)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </section>
        )}

        {/* ============ RODAPÉ ============ */}
        <footer className="mt-10 border-t border-slate-200 pt-4 text-center text-[10px] text-slate-400">
          <p>
            Lista gerada por <span className="font-semibold text-slate-600">Ornabird</span> ·
            Os preços e disponibilidade podem mudar sem aviso prévio.
          </p>
          <p className="mt-1">Entre em contato pelos canais acima para confirmar disponibilidade.</p>
        </footer>
      </div>

      {/* ============ CSS DE IMPRESSÃO ============ */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 12mm 14mm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </main>
  );
}
