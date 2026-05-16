// Reconciliacao Birds <-> HATCHED events
//
// Bug observado: a Chocadeira mostrava NASCIDOS=24 (soma de quantity nos
// events HATCHED), mas o Dashboard mostrava 'Filhotes: 22'. Diferenca
// vinda de events HATCHED que foram registrados sem criar os Bird
// records correspondentes — casos:
//
//   1. Events em batch ainda ACTIVE (nao finalizado) — birds so sao
//      criados em updateBatch quando o status transiciona pra HATCHED.
//   2. Re-finalizacao silenciosa — createListingsFromHatchedBatch retorna
//      'ALREADY_EXISTS' se a listing ja existe, mesmo que novos events
//      tenham sido adicionados depois.
//
// Esse modulo reconcilia: pra cada batch com HATCHED events, garante que
// existe um FlockGroup Chocada com N Birds (N = soma dos quantity).
// Idempotente — se ja esta certo, no-op.

import { prisma } from "@/lib/db/prisma";
import { generateRingNumbers } from "@/lib/plantel/service";

export async function reconcileHatchedBirds(tenantId: string) {
  // Pega batches com pelo menos 1 HATCHED event + suas listings (se houver)
  const batches = await prisma.incubatorBatch.findMany({
    where: { tenantId, events: { some: { type: "HATCHED" } } },
    select: {
      id: true,
      entryDate: true,
      events: { where: { type: "HATCHED" }, select: { quantity: true, eventDate: true } },
      vitrineListings: {
        select: { id: true, flockGroupId: true, initialQuantity: true, availableQuantity: true }
      }
    }
  });

  let birdsCreated = 0;
  let listingsCreated = 0;

  // Lazy import pra evitar ciclo de import com vitrine/service
  const { createListingsFromHatchedBatch } = await import("@/lib/vitrine/service");

  for (const batch of batches) {
    const totalHatched = batch.events.reduce((s, e) => s + e.quantity, 0);
    if (totalHatched <= 0) continue;

    const listing = batch.vitrineListings[0];

    if (!listing) {
      // Sem listing — cria a partir do zero (a funcao ja cria FlockGroup
      // Chocada + N Birds + listing). Idempotente porque a funcao checa
      // alreadyExists.
      const result = await createListingsFromHatchedBatch(tenantId, batch.id);
      if (result.kind === "created") {
        listingsCreated += 1;
        birdsCreated += result.quantity;
      }
      continue;
    }

    // Listing ja existe — conta birds e cria os faltantes
    const currentBirds = await prisma.bird.count({
      where: { tenantId, flockGroupId: listing.flockGroupId }
    });

    if (currentBirds >= totalHatched) continue; // Ja ta sincronizado

    const missing = totalHatched - currentBirds;
    const ringNumbers = await generateRingNumbers(tenantId, missing);
    const birthDate = batch.events.reduce<Date | null>(
      (latest, e) => (!latest || e.eventDate > latest ? e.eventDate : latest),
      null
    ) ?? batch.entryDate;

    await prisma.$transaction(async (tx) => {
      await tx.bird.createMany({
        data: ringNumbers.map((ringNumber) => ({
          tenantId,
          flockGroupId: listing.flockGroupId,
          ringNumber,
          sex: "UNKNOWN" as const,
          status: "ACTIVE" as const,
          acquisitionDate: birthDate
        }))
      });

      await tx.vitrineListing.update({
        where: { id: listing.id },
        data: {
          initialQuantity: { increment: missing },
          availableQuantity: { increment: missing }
        }
      });
    });

    birdsCreated += missing;
  }

  return { birdsCreated, listingsCreated };
}
