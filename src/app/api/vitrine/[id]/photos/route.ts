import { NextRequest, NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { prisma } from "@/lib/db/prisma";
import { uploadImage, UploadConfigError } from "@/lib/upload/vercel-blob";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getApiSessionOr401({ ownerOnly: true });
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const tenantId = auth.session.user.tenantId;

  const listing = await prisma.vitrineListing.findFirst({
    where: { id, tenantId },
    select: { id: true }
  });
  if (!listing) {
    return NextResponse.json({ error: "Anúncio não encontrado." }, { status: 404 });
  }

  const existingPhoto = await prisma.vitrineListingPhoto.findFirst({
    where: { listingId: id },
    select: { id: true }
  });
  if (existingPhoto) {
    return NextResponse.json(
      { error: "Cada lote aceita apenas 1 foto. Remova a foto atual antes de enviar uma nova." },
      { status: 400 }
    );
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Envio inválido." }, { status: 400 });
  }
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo não enviado." }, { status: 400 });
  }

  try {
    const { url } = await uploadImage(file, `vitrine/${tenantId}/${id}`);

    const lastPhoto = await prisma.vitrineListingPhoto.findFirst({
      where: { listingId: id },
      orderBy: { order: "desc" },
      select: { order: true }
    });

    const photo = await prisma.vitrineListingPhoto.create({
      data: {
        listingId: id,
        url,
        order: (lastPhoto?.order ?? -1) + 1
      }
    });

    return NextResponse.json(photo, { status: 201 });
  } catch (error) {
    if (error instanceof UploadConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    const message = error instanceof Error ? error.message : "Erro ao enviar foto.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
