import { NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { batchSchema } from "@/lib/validators/incubators";
import { createBatch, listIncubatorContext } from "@/lib/incubators/service";

export async function GET() {
  const auth = await getApiSessionOr401({ employeePermission: 'incubators' });
  if (!auth.ok) return auth.response;

  const data = await listIncubatorContext(auth.session.user.tenantId);
  return NextResponse.json({ batches: data.batches, flockGroups: data.flockGroups, incubators: data.incubators });
}

export async function POST(request: Request) {
  const auth = await getApiSessionOr401({ employeePermission: 'incubators' });
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const parsed = batchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos." },
      { status: 400 }
    );
  }

  const created = await createBatch(auth.session.user.tenantId, auth.session.user.id, parsed.data);
  if (!created) {
    return NextResponse.json({ error: "Chocadeira ou grupo inválido." }, { status: 404 });
  }

  return NextResponse.json(created, { status: 201 });
}

