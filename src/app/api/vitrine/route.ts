import { NextRequest, NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { listingCreateSchema } from "@/lib/validators/vitrine";
import { createListing, listVitrine } from "@/lib/vitrine/service";

export async function GET() {
  const auth = await getApiSessionOr401({ employeePermission: "vitrine" });
  if (!auth.ok) return auth.response;

  const data = await listVitrine(auth.session.user.tenantId);
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const auth = await getApiSessionOr401({ employeePermission: "vitrine" });
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const parsed = listingCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }

  try {
    const created = await createListing(auth.session.user.tenantId, parsed.data);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao criar anúncio.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
