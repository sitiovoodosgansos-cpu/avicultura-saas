import { NextRequest, NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { createEmployee, listEmployees } from "@/lib/employees/service";
import { employeeSchema } from "@/lib/validators/employees";

export async function GET() {
  const auth = await getApiSessionOr401({ ownerOnly: true });
  if (!auth.ok) return auth.response;

  const employees = await listEmployees(auth.session.user.tenantId);
  return NextResponse.json({ employees });
}

export async function POST(request: NextRequest) {
  const auth = await getApiSessionOr401({ ownerOnly: true });
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const parsed = employeeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }

  const result = await createEmployee(auth.session.user.tenantId, parsed.data);
  if (result.kind === "duplicate") {
    return NextResponse.json({ error: "Já existe um funcionário com este e-mail." }, { status: 409 });
  }

  return NextResponse.json(result.employee, { status: 201 });
}
