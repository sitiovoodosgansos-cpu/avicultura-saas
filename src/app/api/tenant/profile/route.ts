import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { prisma } from "@/lib/db/prisma";

const profileSchema = z.object({
  name: z.string().trim().min(1).optional(),
  legalName: z.string().trim().optional().nullable(),
  cnpj: z.string().trim().optional().nullable(),
  email: z.string().trim().optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  whatsapp: z.string().trim().optional().nullable(),
  addressLine: z.string().trim().optional().nullable(),
  city: z.string().trim().optional().nullable(),
  stateUf: z.string().trim().max(2).optional().nullable(),
  zipCode: z.string().trim().optional().nullable(),
  logoUrl: z.string().trim().optional().nullable(),
  receiptNotes: z.string().trim().optional().nullable()
});

export async function GET() {
  const auth = await getApiSessionOr401({ ownerOnly: true });
  if (!auth.ok) return auth.response;
  const tenant = await prisma.tenant.findUnique({
    where: { id: auth.session.user.tenantId },
    select: {
      id: true,
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
  });
  return NextResponse.json({ tenant });
}

export async function PUT(request: NextRequest) {
  const auth = await getApiSessionOr401({ ownerOnly: true });
  if (!auth.ok) return auth.response;
  const body = await request.json();
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }
  const data: Record<string, string | null> = {};
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v === undefined) continue;
    data[k] = v === "" ? null : (v as string | null);
  }
  const updated = await prisma.tenant.update({
    where: { id: auth.session.user.tenantId },
    data
  });
  return NextResponse.json({
    tenant: {
      id: updated.id,
      name: updated.name,
      legalName: updated.legalName,
      cnpj: updated.cnpj,
      email: updated.email,
      phone: updated.phone,
      whatsapp: updated.whatsapp,
      addressLine: updated.addressLine,
      city: updated.city,
      stateUf: updated.stateUf,
      zipCode: updated.zipCode,
      logoUrl: updated.logoUrl,
      receiptNotes: updated.receiptNotes
    }
  });
}
