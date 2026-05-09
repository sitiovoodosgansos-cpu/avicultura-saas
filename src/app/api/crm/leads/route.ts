import { NextRequest, NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { leadCreateSchema } from "@/lib/validators/crm";
import { createLead, listLeads } from "@/lib/crm/service";

export async function GET(request: NextRequest) {
  const auth = await getApiSessionOr401({ employeePermission: "crm" });
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const archived = searchParams.get("archived") === "true";

  const leads = await listLeads(auth.session.user.tenantId, { archived });
  return NextResponse.json({ leads });
}

export async function POST(request: NextRequest) {
  const auth = await getApiSessionOr401({ employeePermission: "crm" });
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const parsed = leadCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }

  const created = await createLead(
    auth.session.user.tenantId,
    auth.session.user.id,
    parsed.data
  );
  return NextResponse.json(created, { status: 201 });
}
