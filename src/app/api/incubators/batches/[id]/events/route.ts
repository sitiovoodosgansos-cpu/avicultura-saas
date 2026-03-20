import { NextRequest, NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { batchEventSchema } from "@/lib/validators/incubators";
import { addBatchEvent } from "@/lib/incubators/service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getApiSessionOr401({ employeePermission: 'incubators' });
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json();
  const parsed = batchEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }

  const created = await addBatchEvent(auth.session.user.tenantId, auth.session.user.id, id, parsed.data);
  if (!created) {
    return NextResponse.json({ error: "Lote não encontrado." }, { status: 404 });
  }

  return NextResponse.json(created, { status: 201 });
}

