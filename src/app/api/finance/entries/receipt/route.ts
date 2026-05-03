import { NextRequest, NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { prisma } from "@/lib/db/prisma";
import { generateReceiptPdf } from "@/lib/finance/receipt-pdf";

export async function GET(request: NextRequest) {
  const auth = await getApiSessionOr401({ ownerOnly: true });
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const idsParam = url.searchParams.get("ids");
  const ids = idsParam
    ? idsParam.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  if (ids.length === 0) {
    return NextResponse.json({ error: "Selecione ao menos uma entrada." }, { status: 400 });
  }

  const tenantId = auth.session.user.tenantId;

  const [entries, tenant] = await Promise.all([
    prisma.financialEntry.findMany({
      where: { id: { in: ids }, tenantId },
      orderBy: { date: "asc" },
      select: {
        id: true,
        date: true,
        category: true,
        item: true,
        amount: true,
        description: true,
        customer: true,
        notes: true,
        createdAt: true
      }
    }),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        name: true,
        legalName: true,
        cnpj: true,
        email: true,
        phone: true,
        whatsapp: true,
        addressLine: true,
        city: true,
        stateUf: true,
        zipCode: true,
        logoUrl: true,
        receiptNotes: true
      }
    })
  ]);

  if (entries.length === 0 || !tenant) {
    return NextResponse.json({ error: "Entradas não encontradas." }, { status: 404 });
  }

  const total = entries.reduce((sum, e) => sum + Number(e.amount), 0);
  const issuedAt = new Date().toISOString();

  // Numero do recibo: usa o id mais antigo + ano da primeira entrada
  const oldest = entries[0];
  const number = `${String(oldest.id).slice(-4).toUpperCase()}/${oldest.createdAt.getFullYear()}`;

  // Cliente: usa o primeiro nao-vazio (assumimos mesma pessoa quando user agrupa)
  const customer = entries.find((e) => e.customer?.trim())?.customer ?? null;

  // Combinar observacoes
  const allNotes = entries
    .map((e) => e.notes?.trim())
    .filter((s): s is string => Boolean(s));
  const notes = allNotes.length > 0 ? allNotes.join(" · ") : null;

  // Cada entrada vira um item do recibo
  const items = entries.map((e) => ({
    description:
      `${new Date(e.date).toLocaleDateString("pt-BR")} — ` +
      (e.description?.trim() || e.item || "Venda"),
    quantity: 1,
    unitPrice: Number(e.amount),
    total: Number(e.amount)
  }));

  const pdf = await generateReceiptPdf({
    number,
    issuedAt,
    tenant,
    customer: { name: customer },
    items,
    total,
    paymentMethod: null,
    notes
  });

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="recibo-${number.replace("/", "-")}.pdf"`
    }
  });
}
