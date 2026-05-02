import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { prisma } from "@/lib/db/prisma";

export async function POST(request: NextRequest) {
  const auth = await getApiSessionOr401({ ownerOnly: true });
  if (!auth.ok) return auth.response;

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo ausente." }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "Arquivo vazio." }, { status: 400 });
  }
  if (file.size > 4 * 1024 * 1024) {
    return NextResponse.json({ error: "Imagem maior que 4 MB." }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Envie um arquivo de imagem." }, { status: 400 });
  }

  const tenantId = auth.session.user.tenantId;
  const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
  const safeExt = ext.length <= 5 ? ext : "png";
  const key = `tenants/${tenantId}/logo-${Date.now()}.${safeExt}`;

  const blob = await put(key, file, {
    access: "public",
    addRandomSuffix: false,
    contentType: file.type
  });

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { logoUrl: blob.url }
  });

  return NextResponse.json({ url: blob.url });
}
