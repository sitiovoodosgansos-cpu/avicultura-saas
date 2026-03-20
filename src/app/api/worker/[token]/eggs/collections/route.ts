import { NextRequest, NextResponse } from "next/server";
import { getWorkerLinkOr401 } from "@/lib/worker-links/auth";
import { eggCollectionSchema } from "@/lib/validators/eggs";
import { createEggCollection } from "@/lib/eggs/service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const auth = await getWorkerLinkOr401(token, "eggs");
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const parsed = eggCollectionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }

  const created = await createEggCollection(auth.link.tenantId, null, parsed.data);
  if (!created) {
    return NextResponse.json({ error: "Grupo não encontrado." }, { status: 404 });
  }

  return NextResponse.json(created, { status: 201 });
}
