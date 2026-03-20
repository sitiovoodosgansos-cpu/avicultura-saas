import { NextRequest, NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { createWorkerLink, listWorkerLinks } from "@/lib/worker-links/service";

export async function GET() {
  const auth = await getApiSessionOr401({ ownerOnly: true });
  if (!auth.ok) return auth.response;

  const links = await listWorkerLinks(auth.session.user.tenantId);
  return NextResponse.json({ links });
}

export async function POST(request: NextRequest) {
  const auth = await getApiSessionOr401({ ownerOnly: true });
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const link = await createWorkerLink(auth.session.user.tenantId, body);
  return NextResponse.json(link, { status: 201 });
}

