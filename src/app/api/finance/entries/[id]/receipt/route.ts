import { NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { prisma } from "@/lib/db/prisma";
import { generateReceiptPdf } from "@/lib/finance/receipt-pdf";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getApiSessionOr401({ ownerOnly: true });
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const tenantId = auth.session.user.tenantId;

  const [entry, tenant] = await Promise.all([
    prisma.financialEntry.findFirst({
      where: { id, tenantId },
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

  if (!entry || !tenant) {
    return NextResponse.json({ error: "Entrada não encontrada." }, { status: 404 });
  }

  const amount = Number(entry.amount);
  const issuedAt = new Date().toISOString();
  const dt = new Date(entry.createdAt);
  const number = `${String(entry.id).slice(-4).toUpperCase()}/${dt.getFullYear()}`;

  const pdf = await generateReceiptPdf({
    number,
    issuedAt,
    tenant,
    customer: { name: entry.customer ?? null },
    items: [
      {
        description: entry.description?.trim() || entry.item || "Venda",
        quantity: 1,
        unitPrice: amount,
        total: amount
      }
    ],
    total: amount,
    paymentMethod: null,
    notes: entry.notes ?? null
  });

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="recibo-${number.replace("/", "-")}.pdf"`
    }
  });
}
