import { NextRequest, NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { eggCollectionSchema } from "@/lib/validators/eggs";
import { createEggCollection, listEggCollections } from "@/lib/eggs/service";

export async function GET(request: NextRequest) {
  const auth = await getApiSessionOr401({ employeePermission: 'eggs' });
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const data = await listEggCollections(auth.session.user.tenantId, {
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
    groupId: searchParams.get("groupId") ?? undefined
  });

  return NextResponse.json({ collections: data });
}

export async function POST(request: NextRequest) {
  const auth = await getApiSessionOr401({ employeePermission: 'eggs' });
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const parsed = eggCollectionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }

  const created = await createEggCollection(
    auth.session.user.tenantId,
    auth.session.user.id,
    parsed.data
  );

  if (!created) {
    return NextResponse.json({ error: "Grupo não encontrado." }, { status: 404 });
  }

  return NextResponse.json(created, { status: 201 });
}

