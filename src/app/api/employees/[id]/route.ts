import { NextRequest, NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { deactivateEmployee, updateEmployee } from "@/lib/employees/service";
import { employeeUpdateSchema } from "@/lib/validators/employees";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getApiSessionOr401({ ownerOnly: true });
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const parsed = employeeUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }

  const { id } = await params;
  const result = await updateEmployee(auth.session.user.tenantId, id, parsed.data);
  if (result.kind === "not_found") {
    return NextResponse.json({ error: "Funcionário não encontrado." }, { status: 404 });
  }
  if (result.kind === "duplicate") {
    return NextResponse.json({ error: "Já existe um funcionário com este e-mail." }, { status: 409 });
  }

  return NextResponse.json(result.employee);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getApiSessionOr401({ ownerOnly: true });
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const deleted = await deactivateEmployee(auth.session.user.tenantId, id);
  if (!deleted) {
    return NextResponse.json({ error: "Funcionário não encontrado." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
