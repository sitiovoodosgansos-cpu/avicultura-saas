import { NextRequest, NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { listVaccinations, recordVaccination } from "@/lib/health/vaccinations";
import { birdVaccinationSchema } from "@/lib/validators/health-catalogs";

export async function GET(request: NextRequest) {
  const auth = await getApiSessionOr401({ employeePermission: "health" });
  if (!auth.ok) return auth.response;
  const { searchParams } = new URL(request.url);
  const birdId = searchParams.get("birdId") ?? undefined;
  const data = await listVaccinations(auth.session.user.tenantId, { birdId });
  return NextResponse.json({ items: data });
}

export async function POST(request: NextRequest) {
  const auth = await getApiSessionOr401({ employeePermission: "health" });
  if (!auth.ok) return auth.response;
  const body = await request.json();
  const parsed = birdVaccinationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }
  try {
    const created = await recordVaccination(auth.session.user.tenantId, parsed.data);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao registrar vacinação." },
      { status: 400 }
    );
  }
}
