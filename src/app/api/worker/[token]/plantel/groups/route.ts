import { NextRequest, NextResponse } from "next/server";
import { getWorkerLinkOr401 } from "@/lib/worker-links/auth";
import { flockGroupSchema } from "@/lib/validators/plantel";
import { createFlockGroup } from "@/lib/plantel/service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const auth = await getWorkerLinkOr401(token, "plantel");
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const parsed = flockGroupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }

  const created = await createFlockGroup(auth.link.tenantId, parsed.data);
  return NextResponse.json(created, { status: 201 });
}
