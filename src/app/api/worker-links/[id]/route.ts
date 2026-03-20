import { NextRequest, NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { disableWorkerLink } from "@/lib/worker-links/service";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getApiSessionOr401({ ownerOnly: true });
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const updated = await disableWorkerLink(auth.session.user.tenantId, id);

  if (!updated) {
    return NextResponse.json({ error: "Link não encontrado." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

