import { NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { prisma } from "@/lib/db/prisma";

// GET /api/vitrine/[id]/birds
// Retorna as Birds vinculadas a um listing AGREGADO (aves avulsas em lote).
// Usado pelo modal "Ver aves do lote" da vitrine pra mostrar anilhas, sexo
// e status individualmente — com deeplink pro plantel pra marcar
// morte/doenca/edicao.
//
// Comportamento:
// - Listing tem `aggregatedBirds`: retorna a lista (ordenada por ringNumber)
// - Listing 1:1 (sourceBirdId): retorna a Bird unica
// - Listing de chocada (sourceIncubatorBatchId): retorna Birds do flockGroup
//   do listing (cada chocada vira sub-FlockGroup que agrupa as aves)
// - Listing avulso ANTIGO (sem aggregatedListingId vinculado): retorna vazio
//   — usuario sabe que esses lotes anteriores ao fix nao tem rastreio
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getApiSessionOr401({ employeePermission: "vitrine" });
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const tenantId = auth.session.user.tenantId;

  const listing = await prisma.vitrineListing.findFirst({
    where: { id, tenantId },
    select: {
      id: true,
      title: true,
      sourceBirdId: true,
      sourceIncubatorBatchId: true,
      flockGroupId: true,
      sourceIncubatorBatch: { select: { flockGroup: { select: { id: true } } } }
    }
  });
  if (!listing) {
    return NextResponse.json({ error: "Listing não encontrado." }, { status: 404 });
  }

  // Resolve a query de Birds com base no tipo de listing
  let birds;

  if (listing.sourceBirdId) {
    // 1:1 (ave publicada individualmente do plantel)
    birds = await prisma.bird.findMany({
      where: { tenantId, id: listing.sourceBirdId },
      select: {
        id: true,
        ringNumber: true,
        nickname: true,
        sex: true,
        status: true,
        flockGroupId: true
      }
    });
  } else if (listing.sourceIncubatorBatchId && listing.sourceIncubatorBatch) {
    // Chocada — Birds estao num sub-FlockGroup do listing.flockGroupId
    birds = await prisma.bird.findMany({
      where: { tenantId, flockGroupId: listing.flockGroupId },
      select: {
        id: true,
        ringNumber: true,
        nickname: true,
        sex: true,
        status: true,
        flockGroupId: true
      },
      orderBy: { ringNumber: "asc" }
    });
  } else {
    // Avulsa ou recria — filtra por aggregatedListingId
    birds = await prisma.bird.findMany({
      where: { tenantId, aggregatedListingId: id },
      select: {
        id: true,
        ringNumber: true,
        nickname: true,
        sex: true,
        status: true,
        flockGroupId: true
      },
      orderBy: { ringNumber: "asc" }
    });
  }

  return NextResponse.json({
    listing: { id: listing.id, title: listing.title },
    birds
  });
}
