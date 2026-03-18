import { NextRequest, NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { flockGroupSchema } from "@/lib/validators/plantel";
import { createFlockGroup, listPlantel } from "@/lib/plantel/service";

export async function GET(request: NextRequest) {
  const auth = await getApiSessionOr401();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);

  const data = await listPlantel(auth.session.user.tenantId, {
    species: searchParams.get("species") ?? undefined,
    breed: searchParams.get("breed") ?? undefined,
    variety: searchParams.get("variety") ?? undefined,
    status: (searchParams.get("status") as "ACTIVE" | "SICK" | "DEAD" | "BROODY" | null) ?? undefined,
    ring: searchParams.get("ring") ?? undefined
  });

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const auth = await getApiSessionOr401();
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const parsed = flockGroupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }

  const created = await createFlockGroup(auth.session.user.tenantId, parsed.data);
  return NextResponse.json(created, { status: 201 });
}
