import { NextRequest, NextResponse } from "next/server";
import { getWorkerLinkOr401 } from "@/lib/worker-links/auth";
import { batchSchema } from "@/lib/validators/incubators";
import { createBatch } from "@/lib/incubators/service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const auth = await getWorkerLinkOr401(token, "incubators");
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const parsed = batchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }

  const created = await createBatch(auth.link.tenantId, null, parsed.data);
  if (!created) {
    return NextResponse.json({ error: "Chocadeira ou grupo não encontrado." }, { status: 404 });
  }

  return NextResponse.json(created, { status: 201 });
}
