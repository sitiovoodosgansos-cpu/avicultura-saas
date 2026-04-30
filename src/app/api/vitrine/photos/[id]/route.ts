import { NextRequest, NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { prisma } from "@/lib/db/prisma";
import { deleteImage } from "@/lib/upload/vercel-blob";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getApiSessionOr401({ ownerOnly: true });
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const tenantId = auth.session.user.tenantId;

  const photo = await prisma.vitrineListingPhoto.findFirst({
    where: { id },
    include: { listing: { select: { tenantId: true } } }
  });
  if (!photo || photo.listing.tenantId !== tenantId) {
    return NextResponse.json({ error: "Foto não encontrada." }, { status: 404 });
  }

  await deleteImage(photo.url);
  await prisma.vitrineListingPhoto.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
