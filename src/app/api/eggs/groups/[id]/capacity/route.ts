import { NextRequest, NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { groupCapacitySchema } from "@/lib/validators/eggs";
import { updateGroupLayCapacity } from "@/lib/eggs/service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getApiSessionOr401({ employeePermission: 'eggs' });
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json();
  const parsed = groupCapacitySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }

  const updated = await updateGroupLayCapacity(
    auth.session.user.tenantId,
    id,
    parsed.data.expectedLayCapacity
  );

  if (!updated) {
    return NextResponse.json({ error: "Grupo não encontrado." }, { status: 404 });
  }

  return NextResponse.json(updated);
}

