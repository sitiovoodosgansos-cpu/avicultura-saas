import { NextRequest, NextResponse } from "next/server";
import { archiveColdLeads } from "@/lib/crm/archive-job";

// Endpoint protegido pelo header "Authorization: Bearer ${CRON_SECRET}".
// Vercel Cron setados em vercel.json passam esse header automaticamente.
export async function POST(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  try {
    const stats = await archiveColdLeads();
    return NextResponse.json({ ok: true, ...stats });
  } catch (err) {
    console.error("[cron.archive-cold-leads] failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha desconhecida." },
      { status: 500 }
    );
  }
}

// GET pra debug manual (dev) — tambem requer secret
export async function GET(request: NextRequest) {
  return POST(request);
}
