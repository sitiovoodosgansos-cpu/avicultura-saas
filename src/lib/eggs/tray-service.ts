import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";

const DEFAULT_EXPIRY_DAYS = 10;

function toDate(value: string) {
  return new Date(`${value}T12:00:00`);
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

type FlockGroupLabels = {
  speciesLabel: string;
  breedLabel: string;
  varietyLabel: string | null;
};

async function resolveFlockGroupLabels(tenantId: string, flockGroupId: string): Promise<FlockGroupLabels | null> {
  const group = await prisma.flockGroup.findFirst({
    where: { id: flockGroupId, tenantId },
    select: {
      species: { select: { name: true } },
      breed: { select: { name: true } },
      variety: { select: { name: true } }
    }
  });
  if (!group) return null;
  return {
    speciesLabel: group.species.name,
    breedLabel: group.breed.name,
    varietyLabel: group.variety?.name ?? null
  };
}

async function findOrCreateTray(
  tx: Prisma.TransactionClient,
  tenantId: string,
  flockGroupId: string | null,
  labels: FlockGroupLabels,
  expiryDays = DEFAULT_EXPIRY_DAYS
) {
  const existing = await tx.eggTray.findFirst({
    where: {
      tenantId,
      status: "ACTIVE",
      flockGroupId: flockGroupId ?? undefined,
      speciesLabel: labels.speciesLabel,
      breedLabel: labels.breedLabel,
      varietyLabel: labels.varietyLabel
    }
  });
  if (existing) return existing;

  return tx.eggTray.create({
    data: {
      tenantId,
      flockGroupId,
      speciesLabel: labels.speciesLabel,
      breedLabel: labels.breedLabel,
      varietyLabel: labels.varietyLabel,
      expiryDays
    }
  });
}

export async function createTrayEntryFromCollection(
  tenantId: string,
  collectionId: string,
  flockGroupId: string,
  date: Date,
  goodEggs: number
) {
  if (goodEggs <= 0) return null;
  const labels = await resolveFlockGroupLabels(tenantId, flockGroupId);
  if (!labels) return null;

  return prisma.$transaction(async (tx) => {
    const tray = await findOrCreateTray(tx, tenantId, flockGroupId, labels);
    return tx.eggTrayEntry.create({
      data: {
        tenantId,
        trayId: tray.id,
        eggCollectionId: collectionId,
        source: "COLLECTION",
        entryDate: date,
        initialCount: goodEggs
      }
    });
  });
}

export async function listTrays(tenantId: string) {
  const trays = await prisma.eggTray.findMany({
    where: { tenantId, status: "ACTIVE" },
    include: {
      entries: {
        orderBy: { entryDate: "asc" }
      },
      flockGroup: { select: { id: true, title: true } }
    },
    orderBy: [{ speciesLabel: "asc" }, { breedLabel: "asc" }]
  });

  const today = startOfDay(new Date());

  return trays
    .map((tray) => {
      const entries = tray.entries
        .filter(
          (entry) => entry.initialCount - entry.soldCount - entry.discardedCount - entry.transferredCount > 0
        )
        .map((entry) => {
        const expiresAt = new Date(entry.entryDate);
        expiresAt.setDate(expiresAt.getDate() + tray.expiryDays);
        const remainingDays = Math.ceil((startOfDay(expiresAt).getTime() - today.getTime()) / 86400000);
        const available = Math.max(
          0,
          entry.initialCount - entry.soldCount - entry.discardedCount - entry.transferredCount
        );
        return {
          id: entry.id,
          entryDate: entry.entryDate.toISOString(),
          initialCount: entry.initialCount,
          soldCount: entry.soldCount,
          discardedCount: entry.discardedCount,
          transferredCount: entry.transferredCount,
          available,
          expiresAt: expiresAt.toISOString(),
          remainingDays,
          source: entry.source,
          notes: entry.notes
        };
      });

      const totalAvailable = entries.reduce((sum, e) => sum + e.available, 0);
      const oldestRemaining = entries
        .filter((e) => e.available > 0)
        .reduce<number | null>((min, e) => (min === null || e.remainingDays < min ? e.remainingDays : min), null);

      return {
        id: tray.id,
        flockGroupId: tray.flockGroupId,
        flockGroupTitle: tray.flockGroup?.title ?? null,
        speciesLabel: tray.speciesLabel,
        breedLabel: tray.breedLabel,
        varietyLabel: tray.varietyLabel,
        expiryDays: tray.expiryDays,
        notes: tray.notes,
        totalAvailable,
        oldestRemaining,
        entries
      };
    })
    .filter((tray) => tray.totalAvailable > 0);
}

export async function addExternalTray(
  tenantId: string,
  userId: string | null,
  input: {
    flockGroupId?: string | null;
    speciesLabel: string;
    breedLabel: string;
    varietyLabel?: string | null;
    entryDate: string;
    initialCount: number;
    expiryDays?: number;
    notes?: string;
  }
) {
  const labels: FlockGroupLabels = {
    speciesLabel: input.speciesLabel,
    breedLabel: input.breedLabel,
    varietyLabel: input.varietyLabel ?? null
  };

  const created = await prisma.$transaction(async (tx) => {
    const tray = await findOrCreateTray(
      tx,
      tenantId,
      input.flockGroupId ?? null,
      labels,
      input.expiryDays ?? DEFAULT_EXPIRY_DAYS
    );
    return tx.eggTrayEntry.create({
      data: {
        tenantId,
        trayId: tray.id,
        source: "EXTERNAL",
        entryDate: toDate(input.entryDate),
        initialCount: input.initialCount,
        notes: input.notes
      }
    });
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId: userId ?? undefined,
      action: "EGG_TRAY_ENTRY_EXTERNAL",
      entity: "EggTrayEntry",
      entityId: created.id,
      after: { initialCount: created.initialCount, source: "EXTERNAL" }
    }
  });

  return created;
}

export async function discardFromEntry(
  tenantId: string,
  userId: string | null,
  input: { trayEntryId: string; quantity: number; notes?: string }
) {
  const entry = await prisma.eggTrayEntry.findFirst({ where: { id: input.trayEntryId, tenantId } });
  if (!entry) return { ok: false as const, reason: "NOT_FOUND" as const };

  const available = entry.initialCount - entry.soldCount - entry.discardedCount - entry.transferredCount;
  if (input.quantity > available) {
    return { ok: false as const, reason: "EXCEEDS_AVAILABLE" as const, available };
  }

  const updated = await prisma.eggTrayEntry.update({
    where: { id: entry.id },
    data: { discardedCount: entry.discardedCount + input.quantity }
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId: userId ?? undefined,
      action: "EGG_TRAY_DISCARD",
      entity: "EggTrayEntry",
      entityId: entry.id,
      before: { discardedCount: entry.discardedCount },
      after: { discardedCount: updated.discardedCount, reason: input.notes }
    }
  });

  return { ok: true as const, entry: updated };
}

type EntryWithAvailable = { id: string; available: number; entryDate: Date };

async function consumeFifo(
  tx: Prisma.TransactionClient,
  tenantId: string,
  trayId: string,
  totalQuantity: number,
  field: "soldCount" | "transferredCount"
): Promise<{ entries: EntryWithAvailable[]; consumed: Array<{ entryId: string; entryDate: Date; quantity: number }> }> {
  const entries = await tx.eggTrayEntry.findMany({
    where: { tenantId, trayId },
    orderBy: { entryDate: "asc" }
  });

  const withAvailable: EntryWithAvailable[] = entries.map((e) => ({
    id: e.id,
    entryDate: e.entryDate,
    available: e.initialCount - e.soldCount - e.discardedCount - e.transferredCount
  }));

  const totalAvailable = withAvailable.reduce((sum, e) => sum + e.available, 0);
  if (totalAvailable < totalQuantity) {
    throw new Error(`Quantidade indisponivel. Restam ${totalAvailable} ovos na bandeja.`);
  }

  const consumed: Array<{ entryId: string; entryDate: Date; quantity: number }> = [];
  let remaining = totalQuantity;
  for (const entry of withAvailable) {
    if (remaining <= 0) break;
    if (entry.available <= 0) continue;
    const take = Math.min(entry.available, remaining);
    await tx.eggTrayEntry.update({
      where: { id: entry.id },
      data: { [field]: { increment: take } }
    });
    consumed.push({ entryId: entry.id, entryDate: entry.entryDate, quantity: take });
    remaining -= take;
  }

  return { entries: withAvailable, consumed };
}

export async function discardFromEntries(
  tenantId: string,
  userId: string | null,
  input: { items: Array<{ trayEntryId: string; quantity: number }>; notes?: string }
) {
  if (input.items.length === 0) return { ok: false as const, reason: "EMPTY" as const };

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const results = [];
      for (const item of input.items) {
        const entry = await tx.eggTrayEntry.findFirst({ where: { id: item.trayEntryId, tenantId } });
        if (!entry) throw new Error(`Entrada nao encontrada.`);
        const available = entry.initialCount - entry.soldCount - entry.discardedCount - entry.transferredCount;
        if (item.quantity > available) {
          throw new Error(`Quantidade indisponivel em uma das entradas. Restam ${available}.`);
        }
        const u = await tx.eggTrayEntry.update({
          where: { id: entry.id },
          data: { discardedCount: entry.discardedCount + item.quantity }
        });
        results.push(u);
      }
      return results;
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: userId ?? undefined,
        action: "EGG_TRAY_DISCARD_BULK",
        entity: "EggTrayEntry",
        entityId: input.items.map((i) => i.trayEntryId).join(","),
        after: { count: updated.length, reason: input.notes }
      }
    });

    return { ok: true as const, entries: updated };
  } catch (err) {
    return { ok: false as const, reason: "EXCEEDS_AVAILABLE" as const, message: (err as Error).message };
  }
}

export async function transferTrayToIncubator(
  tenantId: string,
  userId: string | null,
  input: { trayId: string; incubatorId: string; quantity: number; notes?: string }
) {
  const tray = await prisma.eggTray.findFirst({
    where: { id: input.trayId, tenantId },
    include: { flockGroup: true }
  });
  if (!tray) return { ok: false as const, reason: "TRAY_NOT_FOUND" as const };
  if (!tray.flockGroupId) {
    return { ok: false as const, reason: "NO_FLOCK_GROUP" as const };
  }
  const incubator = await prisma.incubator.findFirst({ where: { id: input.incubatorId, tenantId } });
  if (!incubator) return { ok: false as const, reason: "INCUBATOR_NOT_FOUND" as const };

  try {
    const batch = await prisma.$transaction(async (tx) => {
      const consumption = await consumeFifo(tx, tenantId, tray.id, input.quantity, "transferredCount");
      const created = await tx.incubatorBatch.create({
        data: {
          tenantId,
          incubatorId: input.incubatorId,
          flockGroupId: tray.flockGroupId!,
          entryDate: new Date(),
          eggsSet: input.quantity,
          status: "ACTIVE",
          notes: input.notes ?? `Transferido da prateleira (${tray.speciesLabel} ${tray.breedLabel}).`
        }
      });
      for (const slice of consumption.consumed) {
        await tx.incubatorBatchSource.create({
          data: {
            tenantId,
            batchId: created.id,
            trayEntryId: slice.entryId,
            collectionDate: slice.entryDate,
            quantity: slice.quantity
          }
        });
      }
      return created;
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: userId ?? undefined,
        action: "EGG_TRAY_TRANSFER",
        entity: "IncubatorBatch",
        entityId: batch.id,
        after: { trayId: tray.id, quantity: input.quantity }
      }
    });

    return { ok: true as const, batch };
  } catch (err) {
    return { ok: false as const, reason: "EXCEEDS_AVAILABLE" as const, message: (err as Error).message };
  }
}

export async function transferTraysBulkToIncubator(
  tenantId: string,
  userId: string | null,
  input: { incubatorId: string; items: Array<{ trayEntryId: string; quantity: number }>; notes?: string }
) {
  const incubator = await prisma.incubator.findFirst({ where: { id: input.incubatorId, tenantId } });
  if (!incubator) return { ok: false as const, reason: "INCUBATOR_NOT_FOUND" as const };

  try {
    const batches = await prisma.$transaction(async (tx) => {
      const created = [];
      for (const item of input.items) {
        const entry = await tx.eggTrayEntry.findFirst({
          where: { id: item.trayEntryId, tenantId },
          include: { tray: true }
        });
        if (!entry) throw new Error("Entrada nao encontrada.");
        if (!entry.tray.flockGroupId) {
          throw new Error(`Bandeja externa "${entry.tray.speciesLabel}" sem grupo do plantel.`);
        }
        const available = entry.initialCount - entry.soldCount - entry.discardedCount - entry.transferredCount;
        if (item.quantity > available) {
          throw new Error(`Quantidade indisponivel. Restam ${available} ovos nessa data.`);
        }
        await tx.eggTrayEntry.update({
          where: { id: entry.id },
          data: { transferredCount: { increment: item.quantity } }
        });
        const batch = await tx.incubatorBatch.create({
          data: {
            tenantId,
            incubatorId: input.incubatorId,
            flockGroupId: entry.tray.flockGroupId,
            entryDate: new Date(),
            eggsSet: item.quantity,
            status: "ACTIVE",
            notes: input.notes ?? `Transferido da prateleira (${entry.tray.speciesLabel} ${entry.tray.breedLabel}).`
          }
        });
        await tx.incubatorBatchSource.create({
          data: {
            tenantId,
            batchId: batch.id,
            trayEntryId: entry.id,
            collectionDate: entry.entryDate,
            quantity: item.quantity
          }
        });
        created.push(batch);
      }
      return created;
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: userId ?? undefined,
        action: "EGG_TRAY_TRANSFER_BULK",
        entity: "IncubatorBatch",
        entityId: batches.map((b) => b.id).join(","),
        after: { incubatorId: input.incubatorId, count: batches.length }
      }
    });

    return { ok: true as const, batches };
  } catch (err) {
    return { ok: false as const, reason: "EXCEEDS_AVAILABLE" as const, message: (err as Error).message };
  }
}

export async function createEggSale(
  tenantId: string,
  userId: string | null,
  input: {
    customer?: string;
    soldAt: string;
    paymentMethod?: "PIX" | "CARD" | "CASH";
    shippingFee?: number;
    items: Array<{ trayEntryId: string; quantity: number; unitPrice: number }>;
    notes?: string;
  }
) {
  if (input.items.length === 0) return { ok: false as const, reason: "EMPTY" as const };

  const itemsTotal = input.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const shipping = input.shippingFee ?? 0;
  const totalAmount = itemsTotal + shipping;
  const soldAt = toDate(input.soldAt);

  // Resolve labels do flockGroup para usar como "item" no financeiro
  const entries = await prisma.eggTrayEntry.findMany({
    where: { tenantId, id: { in: input.items.map((i) => i.trayEntryId) } },
    include: { tray: { include: { flockGroup: { select: { title: true } } } } }
  });
  const labelSet = new Set<string>();
  for (const e of entries) {
    const label =
      e.tray.flockGroup?.title?.trim() ||
      [e.tray.speciesLabel, e.tray.breedLabel, e.tray.varietyLabel].filter(Boolean).join(" ") ||
      "Bandeja";
    labelSet.add(label);
  }
  const itemLabel =
    labelSet.size === 0
      ? "Venda de ovos"
      : labelSet.size === 1
        ? Array.from(labelSet)[0]
        : `${Array.from(labelSet).slice(0, 2).join(", ")}${labelSet.size > 2 ? ` +${labelSet.size - 2}` : ""}`;

  // PRE-VALIDACAO fora da transacao: busca todos os entries de uma vez,
  // valida quantidade disponivel e quebra cedo se algo nao bater.
  // Isso reduz o tempo da transaction (que conta no timeout do Prisma).
  const entriesById = new Map(entries.map((e) => [e.id, e]));
  for (const item of input.items) {
    const entry = entriesById.get(item.trayEntryId);
    if (!entry) {
      return { ok: false as const, reason: "EXCEEDS_AVAILABLE" as const, message: "Entrada nao encontrada." };
    }
    const available =
      entry.initialCount - entry.soldCount - entry.discardedCount - entry.transferredCount;
    if (item.quantity > available) {
      return {
        ok: false as const,
        reason: "EXCEEDS_AVAILABLE" as const,
        message: `Quantidade indisponivel. Restam ${available} ovos nessa data.`
      };
    }
  }

  try {
    const sale = await prisma.$transaction(
      async (tx) => {
        const descParts = [
          input.items.map((i) => `${i.quantity}x R$${i.unitPrice.toFixed(2)}`).join(" + "),
          shipping > 0 ? `frete R$${shipping.toFixed(2)}` : null
        ]
          .filter(Boolean)
          .join(" + ");

        const financialEntry = await tx.financialEntry.create({
          data: {
            tenantId,
            date: soldAt,
            category: "EGG_SALE",
            item: itemLabel,
            amount: totalAmount,
            customer: input.customer || null,
            paymentMethod: input.paymentMethod ?? null,
            description: descParts,
            notes: input.notes
          }
        });

        const created = await tx.eggSale.create({
          data: {
            tenantId,
            customer: input.customer || null,
            totalAmount,
            soldAt,
            paymentMethod: input.paymentMethod ?? null,
            shippingFee: shipping > 0 ? shipping : null,
            financialEntryId: financialEntry.id,
            notes: input.notes
          }
        });

        // Updates e creates em PARALELO pra reduzir tempo total da
        // transacao (default Prisma e 5s; antes ficava sequencial e
        // estourava com N itens em rede serverless lenta).
        await Promise.all(
          input.items.flatMap((item) => {
            const subtotal = Number((item.quantity * item.unitPrice).toFixed(2));
            return [
              tx.eggTrayEntry.update({
                where: { id: item.trayEntryId },
                data: { soldCount: { increment: item.quantity } }
              }),
              tx.eggSaleItem.create({
                data: {
                  tenantId,
                  saleId: created.id,
                  trayEntryId: item.trayEntryId,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  subtotal
                }
              })
            ];
          })
        );

        return created;
      },
      // Aumenta timeout pra cobrir cenarios com muitos itens em rede
      // lenta (Vercel <-> Prisma Postgres pode passar de 5s default).
      { maxWait: 10_000, timeout: 30_000 }
    );

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: userId ?? undefined,
        action: "EGG_SALE_CREATE",
        entity: "EggSale",
        entityId: sale.id,
        after: { totalAmount, customer: input.customer ?? null, items: input.items.length }
      }
    });

    return { ok: true as const, sale };
  } catch (err) {
    return { ok: false as const, reason: "EXCEEDS_AVAILABLE" as const, message: (err as Error).message };
  }
}
