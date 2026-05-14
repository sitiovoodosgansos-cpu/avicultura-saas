import { NextRequest, NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { batchEventUpdateSchema } from "@/lib/validators/incubators";
import { deleteBatchEvent, updateBatchEvent } from "@/lib/incubators/service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; eventId: string }> }
) {
  const auth = await getApiSessionOr401({ employeePermission: "incubators" });
  if (!auth.ok) return auth.response;

  const { eventId } = await params;
  const body = await request.json();
  const parsed = batchEventUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados invalidos." },
      { status: 400 }
    );
  }

  const result = await updateBatchEvent(
    auth.session.user.tenantId,
    auth.session.user.id,
    eventId,
    parsed.data
  );
  if (!result.ok) {
    if (result.reason === "NOT_FOUND") {
      return NextResponse.json({ error: "Evento nao encontrado." }, { status: 404 });
    }
    return NextResponse.json(
      { error: result.message ?? "Nao foi possivel atualizar." },
      { status: 400 }
    );
  }

  return NextResponse.json(result.event);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; eventId: string }> }
) {
  const auth = await getApiSessionOr401({ employeePermission: "incubators" });
  if (!auth.ok) return auth.response;

  const { eventId } = await params;
  const ok = await deleteBatchEvent(
    auth.session.user.tenantId,
    auth.session.user.id,
    eventId
  );
  if (!ok) {
    return NextResponse.json({ error: "Evento nao encontrado." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
