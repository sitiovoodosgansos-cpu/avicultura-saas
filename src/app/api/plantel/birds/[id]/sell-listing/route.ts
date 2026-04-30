import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { createListingFromBird } from "@/lib/vitrine/service";

const sellListingSchema = z.object({
  ageInMonths: z.coerce.number().int().min(0, "Idade inválida.").max(999),
  priceOverride: z.coerce.number().min(0).optional().nullable(),
  title: z.string().trim().optional().nullable()
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getApiSessionOr401({ ownerOnly: true });
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json();
  const parsed = sellListingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }

  const result = await createListingFromBird(auth.session.user.tenantId, id, parsed.data);
  if (result.kind === "skipped") {
    if (result.reason === "BIRD_NOT_FOUND") {
      return NextResponse.json({ error: "Ave não encontrada." }, { status: 404 });
    }
    if (result.reason === "ALREADY_LISTED") {
      return NextResponse.json(
        { error: "Esta ave já está na Vitrine." },
        { status: 400 }
      );
    }
  }

  return NextResponse.json(result, { status: 201 });
}
