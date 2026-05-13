import { NextRequest, NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { taskUpdateSchema } from "@/lib/validators/tasks";
import { archiveTask, updateTask } from "@/lib/tasks/service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getApiSessionOr401();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json();
  const parsed = taskUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados invalidos." },
      { status: 400 }
    );
  }

  const updated = await updateTask(auth.session.user.tenantId, id, parsed.data);
  if (!updated) {
    return NextResponse.json({ error: "Tarefa nao encontrada." }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getApiSessionOr401();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const ok = await archiveTask(auth.session.user.tenantId, id);
  if (!ok) {
    return NextResponse.json({ error: "Tarefa nao encontrada." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
