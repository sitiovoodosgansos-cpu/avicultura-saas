import { prisma } from "@/lib/db/prisma";
import { generateRingNumbers } from "@/lib/plantel/service";
import {
  birthDateFromAgeInMonths,
  calculateAgeInMonths,
  getCurrentPrice
} from "@/lib/vitrine/pricing";
import type {
  DeathInput,
  ListingCreateInput,
  ListingUpdateInput,
  PurchasedListingInput,
  SaleInput
} from "@/lib/validators/vitrine";

export async function listVitrine(tenantId: string) {
  const [listings, tiers, flockGroups] = await Promise.all([
    prisma.vitrineListing.findMany({
      where: { tenantId, status: { not: "REMOVED" } },
      include: {
        flockGroup: {
          select: {
            id: true,
            title: true,
            species: { select: { id: true, name: true } },
            breed: { select: { id: true, name: true } },
            variety: { select: { id: true, name: true } }
          }
        },
        sourceIncubatorBatch: {
          select: {
            flockGroup: {
              select: {
                id: true,
                title: true,
                species: { select: { id: true, name: true } },
                breed: { select: { id: true, name: true } },
                variety: { select: { id: true, name: true } }
              }
            }
          }
        },
        photos: { orderBy: { order: "asc" } }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.priceTier.findMany({ where: { tenantId } }),
    prisma.flockGroup.findMany({
      where: {
        tenantId,
        NOT: {
          OR: [
            { title: { startsWith: "Chocada " } },
            { title: { startsWith: "Recria " } }
          ]
        }
      },
      select: {
        id: true,
        title: true,
        species: { select: { id: true, name: true } },
        breed: { select: { id: true, name: true } },
        variety: { select: { id: true, name: true } }
      },
      orderBy: { title: "asc" }
    })
  ]);

  // Ultima vacinacao aplicada nas aves de cada listing (BirdVaccination
  // mais recente entre os Birds em flockGroupId-filhote da chocada).
  const listingFlockGroupIds = listings.map((l) => l.flockGroupId);
  const lastVaccinationsRaw = listingFlockGroupIds.length
    ? await prisma.birdVaccination.findMany({
        where: {
          tenantId,
          bird: { flockGroupId: { in: listingFlockGroupIds } }
        },
        select: {
          appliedAt: true,
          bird: { select: { flockGroupId: true } },
          vaccine: { select: { name: true } }
        },
        orderBy: { appliedAt: "desc" }
      })
    : [];
  const lastVaccByListingGroup = new Map<string, { vaccineName: string; appliedAt: Date }>();
  for (const v of lastVaccinationsRaw) {
    const groupId = v.bird.flockGroupId;
    if (!lastVaccByListingGroup.has(groupId)) {
      lastVaccByListingGroup.set(groupId, {
        vaccineName: v.vaccine.name,
        appliedAt: v.appliedAt
      });
    }
  }

  const enriched = listings.map((listing) => {
    // Agrupamento da Vitrine sempre pelo lote pai original (raca/especie):
    // se a listing veio de uma chocada, o flockGroup direto eh um
    // FlockGroup-filhote interno - usar o FlockGroup do IncubatorBatch como
    // 'card raiz' pra agrupar todos os lotes de filhotes dessa raca juntos.
    const parentGroup = listing.sourceIncubatorBatch?.flockGroup ?? listing.flockGroup;
    const parentFlockGroupId = parentGroup.id;

    // Pricing usa o parent (tabela de precos eh por raca, nao por chocada).
    const result = getCurrentPrice(
      parentFlockGroupId,
      listing.birthDate,
      tiers,
      listing.priceOverride !== null && listing.priceOverride !== undefined
        ? Number(listing.priceOverride)
        : null
    );

    const lastVacc = lastVaccByListingGroup.get(listing.flockGroupId);

    return {
      ...listing,
      priceOverride:
        listing.priceOverride !== null && listing.priceOverride !== undefined
          ? Number(listing.priceOverride)
          : null,
      flockGroup: parentGroup,
      flockGroupId: parentFlockGroupId,
      currentPrice: result.price,
      ageInMonths: result.ageInMonths,
      missingTier: result.missingTier,
      isOverride: result.isOverride,
      lastVaccination: lastVacc
        ? { vaccineName: lastVacc.vaccineName, appliedAt: lastVacc.appliedAt.toISOString() }
        : null,
      purchaseDate: listing.purchaseDate ? listing.purchaseDate.toISOString() : null,
      purchaseCost:
        listing.purchaseCost !== null && listing.purchaseCost !== undefined
          ? Number(listing.purchaseCost)
          : null,
      vendorName: listing.vendorName ?? null
    };
  });

  return {
    listings: enriched,
    flockGroups
  };
}

async function ensureFlockGroup(tenantId: string, flockGroupId: string) {
  const group = await prisma.flockGroup.findFirst({
    where: { id: flockGroupId, tenantId },
    select: { id: true }
  });
  if (!group) throw new Error("Card não encontrado.");
  return group;
}

export async function createListing(tenantId: string, input: ListingCreateInput) {
  await ensureFlockGroup(tenantId, input.flockGroupId);

  const birthDate = birthDateFromAgeInMonths(input.ageInMonths);

  return prisma.vitrineListing.create({
    data: {
      tenantId,
      flockGroupId: input.flockGroupId,
      title: input.title?.trim() || null,
      birthDate,
      initialQuantity: input.initialQuantity,
      availableQuantity: input.initialQuantity,
      priceOverride:
        input.priceOverride !== null && input.priceOverride !== undefined
          ? input.priceOverride
          : null,
      description: input.description?.trim() || null
    }
  });
}

// Cria listing de aves compradas pra revenda (recria). Cria FlockGroup
// oculto com prefixo 'Recria · ' (filtrado das telas do plantel/sanidade/
// reports), o VitrineListing apontando pra ele, e uma FinancialExpense
// (categoria BIRD_PURCHASE) — tudo em transacao.
export async function createPurchasedListing(tenantId: string, input: PurchasedListingInput) {
  // valida species/breed/variety pertencem ao tenant
  const [species, breed, variety] = await Promise.all([
    prisma.species.findFirst({ where: { id: input.speciesId, tenantId }, select: { id: true, name: true } }),
    prisma.breed.findFirst({ where: { id: input.breedId, tenantId }, select: { id: true, name: true } }),
    input.varietyId
      ? prisma.variety.findFirst({ where: { id: input.varietyId, tenantId }, select: { id: true, name: true } })
      : Promise.resolve(null)
  ]);
  if (!species) throw new Error("Espécie não encontrada.");
  if (!breed) throw new Error("Raça não encontrada.");
  if (input.varietyId && !variety) throw new Error("Variedade não encontrada.");

  const purchaseDate = new Date(input.purchaseDate);
  if (Number.isNaN(purchaseDate.getTime())) throw new Error("Data de compra inválida.");

  const birthDate = birthDateFromAgeInMonths(input.ageInMonths);

  const taxonomy = [breed.name, variety?.name].filter(Boolean).join(" ");
  const dateLabel = purchaseDate.toLocaleDateString("pt-BR");
  const groupTitle = `Recria · ${taxonomy} · ${dateLabel}`;

  const result = await prisma.$transaction(async (tx) => {
    const group = await tx.flockGroup.create({
      data: {
        tenantId,
        speciesId: input.speciesId,
        breedId: input.breedId,
        varietyId: input.varietyId ?? null,
        title: groupTitle,
        bayNumber: 0,
        matrixCount: 0,
        reproducerCount: 0,
        notes: input.vendorName ? `Vendedor: ${input.vendorName}` : null
      }
    });

    const listing = await tx.vitrineListing.create({
      data: {
        tenantId,
        flockGroupId: group.id,
        title: input.title?.trim() || null,
        birthDate,
        initialQuantity: input.initialQuantity,
        availableQuantity: input.initialQuantity,
        priceOverride:
          input.priceOverride !== null && input.priceOverride !== undefined ? input.priceOverride : null,
        description: input.description?.trim() || null,
        purchaseDate,
        purchaseCost: input.purchaseCost,
        vendorName: input.vendorName?.trim() || null
      }
    });

    if (input.purchaseCost > 0) {
      await tx.financialExpense.create({
        data: {
          tenantId,
          date: purchaseDate,
          category: "BIRD_PURCHASE",
          item: `Compra de ${input.initialQuantity} ${input.initialQuantity === 1 ? "ave" : "aves"} — ${taxonomy}`,
          amount: input.purchaseCost,
          description: `Recria comprada para revenda${input.vendorName ? ` · ${input.vendorName}` : ""}`,
          supplier: input.vendorName?.trim() || null,
          notes: input.description?.trim() || null
        }
      });
    }

    return listing;
  });

  return result;
}

export async function updateListing(tenantId: string, id: string, input: ListingUpdateInput) {
  const existing = await prisma.vitrineListing.findFirst({
    where: { id, tenantId },
    select: { id: true, initialQuantity: true }
  });
  if (!existing) return null;

  const data: Record<string, unknown> = {};

  if (input.title !== undefined) {
    data.title = input.title?.trim() || null;
  }

  if (input.description !== undefined) {
    data.description = input.description?.trim() || null;
  }

  if (input.ageInMonths !== undefined) {
    data.birthDate = birthDateFromAgeInMonths(input.ageInMonths);
  }

  if (input.availableQuantity !== undefined) {
    if (input.availableQuantity > existing.initialQuantity) {
      throw new Error("Quantidade disponível não pode ser maior que a inicial.");
    }
    data.availableQuantity = input.availableQuantity;
    if (input.availableQuantity === 0 && !input.status) {
      data.status = "SOLD_OUT";
    }
  }

  if (input.priceOverride !== undefined) {
    data.priceOverride = input.priceOverride;
  }

  if (input.status !== undefined) {
    data.status = input.status;
  }

  return prisma.vitrineListing.update({
    where: { id },
    data
  });
}

export async function removeListing(tenantId: string, id: string) {
  const existing = await prisma.vitrineListing.findFirst({
    where: { id, tenantId },
    select: { id: true }
  });
  if (!existing) return false;

  await prisma.vitrineListing.update({
    where: { id },
    data: { status: "REMOVED" }
  });

  return true;
}

export type FromBirdResult =
  | { kind: "created"; listingId: string; missingTier: boolean }
  | { kind: "skipped"; reason: "ALREADY_LISTED" | "BIRD_NOT_FOUND" };

export async function createListingFromBird(
  tenantId: string,
  birdId: string,
  input: { ageInMonths: number; priceOverride?: number | null; title?: string | null }
): Promise<FromBirdResult> {
  const bird = await prisma.bird.findFirst({
    where: { id: birdId, tenantId },
    include: {
      flockGroup: { select: { id: true, title: true } },
      vitrineListing: { select: { id: true, status: true } }
    }
  });
  if (!bird) {
    return { kind: "skipped", reason: "BIRD_NOT_FOUND" };
  }

  if (bird.vitrineListing && bird.vitrineListing.status !== "REMOVED") {
    return { kind: "skipped", reason: "ALREADY_LISTED" };
  }

  const birthDate = birthDateFromAgeInMonths(input.ageInMonths);
  const titleFallback = bird.nickname?.trim() || `Anilha ${bird.ringNumber}`;

  const listing = await prisma.vitrineListing.create({
    data: {
      tenantId,
      flockGroupId: bird.flockGroupId,
      title: input.title?.trim() || titleFallback,
      birthDate,
      initialQuantity: 1,
      availableQuantity: 1,
      priceOverride:
        input.priceOverride !== null && input.priceOverride !== undefined
          ? input.priceOverride
          : null,
      sourceBirdId: bird.id
    }
  });

  const tierExists = await prisma.priceTier.findFirst({
    where: { tenantId, flockGroupId: bird.flockGroupId },
    select: { id: true }
  });

  return {
    kind: "created",
    listingId: listing.id,
    missingTier: !tierExists
  };
}

export type AutoListingResult =
  | { kind: "created"; listingId: string; quantity: number; missingTier: boolean }
  | { kind: "skipped"; reason: "ALREADY_EXISTS" | "NO_HATCHED" | "BATCH_NOT_FOUND" };

/**
 * Called when an IncubatorBatch finishes (status -> HATCHED). Reads all HATCHED
 * events on the batch, sums quantities, and creates a single VitrineListing
 * tied to the batch (sourceIncubatorBatchId). Idempotent: re-running on the
 * same batch returns ALREADY_EXISTS.
 */
export async function createListingsFromHatchedBatch(
  tenantId: string,
  batchId: string
): Promise<AutoListingResult> {
  const alreadyExists = await prisma.vitrineListing.findFirst({
    where: { tenantId, sourceIncubatorBatchId: batchId },
    select: { id: true }
  });
  if (alreadyExists) {
    return { kind: "skipped", reason: "ALREADY_EXISTS" };
  }

  const batch = await prisma.incubatorBatch.findFirst({
    where: { id: batchId, tenantId },
    include: {
      events: { where: { type: "HATCHED" } },
      flockGroup: {
        select: {
          id: true,
          title: true,
          speciesId: true,
          breedId: true,
          varietyId: true,
          bayNumber: true
        }
      }
    }
  });
  if (!batch) {
    return { kind: "skipped", reason: "BATCH_NOT_FOUND" };
  }

  const totalHatched = batch.events.reduce((acc, event) => acc + (event.quantity ?? 0), 0);
  if (totalHatched <= 0) {
    return { kind: "skipped", reason: "NO_HATCHED" };
  }

  const lastEvent = [...batch.events].sort(
    (a, b) => b.eventDate.getTime() - a.eventDate.getTime()
  )[0];
  const birthDate = lastEvent?.eventDate ?? new Date();

  const monthLabel = birthDate.toLocaleDateString("pt-BR", { month: "long" });
  const capitalized = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
  const title = `Lote ${capitalized}/${birthDate.getFullYear()}`;

  const ringNumbers = await generateRingNumbers(tenantId, totalHatched);

  const hatchTitle = `Chocada ${capitalized}/${birthDate.getFullYear()} · ${batch.flockGroup.title}`;

  const listing = await prisma.$transaction(async (tx) => {
    const hatchedFlockGroup = await tx.flockGroup.create({
      data: {
        tenantId,
        title: hatchTitle,
        speciesId: batch.flockGroup.speciesId,
        breedId: batch.flockGroup.breedId,
        varietyId: batch.flockGroup.varietyId,
        bayNumber: batch.flockGroup.bayNumber,
        matrixCount: 0,
        reproducerCount: 0
      }
    });

    if (ringNumbers.length > 0) {
      await tx.bird.createMany({
        data: ringNumbers.map((ringNumber) => ({
          tenantId,
          flockGroupId: hatchedFlockGroup.id,
          ringNumber,
          sex: "UNKNOWN" as const,
          status: "ACTIVE" as const,
          acquisitionDate: birthDate
        }))
      });
    }

    return tx.vitrineListing.create({
      data: {
        tenantId,
        flockGroupId: hatchedFlockGroup.id,
        title,
        birthDate,
        initialQuantity: totalHatched,
        availableQuantity: totalHatched,
        sourceIncubatorBatchId: batch.id
      }
    });
  });

  const tierExists = await prisma.priceTier.findFirst({
    where: { tenantId, flockGroupId: batch.flockGroupId },
    select: { id: true }
  });

  return {
    kind: "created",
    listingId: listing.id,
    quantity: totalHatched,
    missingTier: !tierExists
  };
}

/**
 * Backfill idempotente: para chocadas finalizadas ANTES da feature de criacao
 * automatica de Bird+FlockGroup-filhote (com VitrineListing apontando direto
 * pro lote pai), cria retroativamente o FlockGroup-filhote dedicado + N Birds
 * (anilha auto) e remapeia a listing. Permite que o modal de Filhas mostre
 * aves individuais para todas as chocadas, antigas ou novas.
 */
export async function materializeBirthsForParent(
  tenantId: string,
  parentFlockGroupId: string
): Promise<{ materializedCount: number; birdsCreated: number }> {
  // Etapa 0: chocadas finalizadas (status HATCHED) sem qualquer VitrineListing
  // associada. Cria a listing primeiro (com FlockGroup-filhote + Birds via
  // createListingsFromHatchedBatch).
  const hatchedWithoutListing = await prisma.incubatorBatch.findMany({
    where: {
      tenantId,
      flockGroupId: parentFlockGroupId,
      status: "HATCHED",
      vitrineListings: { none: {} }
    },
    select: { id: true }
  });
  for (const batch of hatchedWithoutListing) {
    await createListingsFromHatchedBatch(tenantId, batch.id);
  }

  const oldListings = await prisma.vitrineListing.findMany({
    where: {
      tenantId,
      flockGroupId: parentFlockGroupId,
      sourceIncubatorBatchId: { not: null },
      status: { not: "REMOVED" }
    },
    include: {
      sourceIncubatorBatch: {
        select: {
          id: true,
          flockGroup: {
            select: {
              id: true,
              title: true,
              speciesId: true,
              breedId: true,
              varietyId: true,
              bayNumber: true
            }
          },
          events: { where: { type: "HATCHED" }, select: { eventDate: true, quantity: true } }
        }
      }
    }
  });

  let materializedCount = 0;
  let birdsCreated = 0;

  for (const listing of oldListings) {
    if (!listing.sourceIncubatorBatch) continue;
    if (listing.sourceIncubatorBatch.flockGroup.id !== parentFlockGroupId) continue;
    if (listing.availableQuantity <= 0) continue;

    const events = listing.sourceIncubatorBatch.events;
    const lastEvent = [...events].sort(
      (a, b) => b.eventDate.getTime() - a.eventDate.getTime()
    )[0];
    const birthDate = lastEvent?.eventDate ?? listing.birthDate ?? new Date();

    const monthLabel = birthDate.toLocaleDateString("pt-BR", { month: "long" });
    const capitalized = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
    const parent = listing.sourceIncubatorBatch.flockGroup;
    const hatchTitle = `Chocada ${capitalized}/${birthDate.getFullYear()} · ${parent.title}`;

    const ringNumbers = await generateRingNumbers(tenantId, listing.availableQuantity);

    await prisma.$transaction(async (tx) => {
      const newGroup = await tx.flockGroup.create({
        data: {
          tenantId,
          title: hatchTitle,
          speciesId: parent.speciesId,
          breedId: parent.breedId,
          varietyId: parent.varietyId,
          bayNumber: parent.bayNumber,
          matrixCount: 0,
          reproducerCount: 0
        }
      });

      if (ringNumbers.length > 0) {
        await tx.bird.createMany({
          data: ringNumbers.map((ringNumber) => ({
            tenantId,
            flockGroupId: newGroup.id,
            ringNumber,
            sex: "UNKNOWN" as const,
            status: "ACTIVE" as const,
            acquisitionDate: birthDate
          }))
        });
      }

      await tx.vitrineListing.update({
        where: { id: listing.id },
        data: { flockGroupId: newGroup.id }
      });
    });

    materializedCount += 1;
    birdsCreated += ringNumbers.length;
  }

  return { materializedCount, birdsCreated };
}

export async function sellListing(tenantId: string, id: string, input: SaleInput) {
  const listing = await prisma.vitrineListing.findFirst({
    where: { id, tenantId },
    include: {
      flockGroup: { select: { title: true } }
    }
  });
  if (!listing) return null;

  if (input.quantity > listing.availableQuantity) {
    throw new Error(
      `Quantidade indisponível. Restam ${listing.availableQuantity} unidade(s).`
    );
  }

  const totalPrice = Number((input.unitPrice * input.quantity).toFixed(2));
  const ageInMonths = calculateAgeInMonths(listing.birthDate);
  const category = ageInMonths < 6 ? "CHICK_SALE" : "ADULT_BIRD_SALE";

  const listingLabel = listing.title?.trim() || listing.flockGroup.title;
  const item = `Venda Vitrine: ${listingLabel}`;

  return prisma.$transaction(async (tx) => {
    const financialEntry = await tx.financialEntry.create({
      data: {
        tenantId,
        date: new Date(),
        category,
        item,
        amount: totalPrice,
        customer: input.customer?.trim() || null,
        description: `${input.quantity}x ${listing.flockGroup.title}`,
        paymentMethod: input.paymentMethod,
        notes: input.notes?.trim() || null
      }
    });

    const sale = await tx.vitrineSale.create({
      data: {
        tenantId,
        listingId: id,
        quantitySold: input.quantity,
        unitPrice: input.unitPrice,
        totalPrice,
        paymentMethod: input.paymentMethod,
        customer: input.customer?.trim() || null,
        notes: input.notes?.trim() || null,
        financialEntryId: financialEntry.id
      }
    });

    const newAvailable = listing.availableQuantity - input.quantity;
    await tx.vitrineListing.update({
      where: { id },
      data: {
        availableQuantity: newAvailable,
        ...(newAvailable === 0 ? { status: "SOLD_OUT" as const } : {})
      }
    });

    return { sale, financialEntry };
  });
}

export async function recordListingDeath(tenantId: string, id: string, input: DeathInput) {
  const listing = await prisma.vitrineListing.findFirst({
    where: { id, tenantId },
    include: {
      sourceBird: { select: { id: true, status: true } }
    }
  });
  if (!listing) return null;

  if (input.quantity > listing.availableQuantity) {
    throw new Error(
      `Quantidade indisponível. Restam ${listing.availableQuantity} ave(s).`
    );
  }

  const newAvailable = listing.availableQuantity - input.quantity;
  const cause = input.cause?.trim() || null;

  return prisma.$transaction(async (tx) => {
    const death = await tx.vitrineDeathRecord.create({
      data: {
        tenantId,
        listingId: id,
        quantity: input.quantity,
        cause
      }
    });

    await tx.vitrineListing.update({
      where: { id },
      data: {
        availableQuantity: newAvailable,
        ...(newAvailable === 0 ? { status: "REMOVED" as const } : {})
      }
    });

    // Listing 1:1 com Bird (origem Plantel) e o lote zerou: marca a ave como morta.
    if (
      listing.sourceBirdId &&
      listing.sourceBird &&
      listing.sourceBird.status !== "DEAD" &&
      newAvailable === 0
    ) {
      await tx.bird.update({
        where: { id: listing.sourceBirdId },
        data: { status: "DEAD" }
      });
      await tx.birdStatusHistory.create({
        data: {
          tenantId,
          birdId: listing.sourceBirdId,
          fromStatus: listing.sourceBird.status,
          toStatus: "DEAD",
          reason: cause ?? "Óbito registrado pela Vitrine"
        }
      });
    }

    return death;
  });
}
