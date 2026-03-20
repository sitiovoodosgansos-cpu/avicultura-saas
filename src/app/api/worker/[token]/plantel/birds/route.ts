import { NextRequest, NextResponse } from "next/server";
import { getWorkerLinkOr401 } from "@/lib/worker-links/auth";
import { birdSchema } from "@/lib/validators/plantel";
import { createBird } from "@/lib/plantel/service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const auth = await getWorkerLinkOr401(token, "plantel");
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const parsed = birdSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }

  const created = await createBird(auth.link.tenantId, "worker-link", parsed.data);
  if (!created) {
    return NextResponse.json({ error: "Grupo não encontrado." }, { status: 404 });
  }

  return NextResponse.json(created, { status: 201 });
}
