// Backup/Wipe/Restore do tenant — botao de panico no Perfil.
//
// FILOSOFIA: backup eh JSON simples com 1 chave por tabela. Restore aceita
// MESMO formato e recria tudo. Wipe deleta tudo do tenant em ordem reversa
// de FK pra nao quebrar constraints. NAO toca em User, EmployeeAccount,
// EmployeeSession, Subscription, PaymentEvent, AuditLog, Farm, Tenant.
//
// Estrategia de IDs: preservamos os CUIDs do backup pra que FK entre
// tabelas continue funcionando (Bird.flockGroupId aponta pro mesmo CUID
// da FlockGroup restaurada).

import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";

export const BACKUP_VERSION = 1 as const;

// Ordem de DELETE: filhos antes de pais (reverso da FK).
// Quando NULL_OUT eh true, primeiro zeramos colunas que possam apontar pra
// rows ja deletadas (caso de relacoes 1:1 nullable cruzadas).
const WIPE_ORDER = [
  "task",
  "leadHistory",
  "lead",
  "vitrineDeathRecord",
  "vitrineSale",
  "vitrineListingPhoto",
  "vitrineListing",
  "eggSaleItem",
  "eggSale",
  "incubatorBatchSource",
  "incubatorBatchEvent",
  "incubatorBatch",
  "incubator",
  "birdVaccination",
  "quarantineTreatment",
  "quarantineCase",
  "infirmaryCaseTreatment",
  "infirmaryCaseEvent",
  "infirmaryCase",
  "quarantineChecklistTemplate",
  "infirmary",
  "birdStatusHistory",
  "bird",
  "eggTrayEntry",
  "eggTray",
  "eggCollection",
  "financialEntry",
  "financialExpense",
  "flockGroup",
  "deathReason",
  "vaccine",
  "medication",
  "disease",
  "eggPrice",
  "priceTier",
  "variety",
  "breed",
  "species",
  "report"
] as const;

type WipeModelKey = (typeof WIPE_ORDER)[number];

// Ordem de INSERT: pais antes de filhos (FORWARD da FK = reverso do WIPE)
const RESTORE_ORDER = [...WIPE_ORDER].reverse() as ReadonlyArray<WipeModelKey>;

export type TenantBackup = {
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  tenantId: string;
  tenantName: string;
  tables: Record<string, unknown[]>;
};

// Helper pra acessar o delegate do Prisma por nome.
function modelDelegate(modelKey: WipeModelKey) {
  // Cast pra any porque os delegates sao tipados especificamente — todos
  // tem deleteMany/findMany/createMany com a mesma assinatura no que nos
  // importa (tenantId scope).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (prisma as any)[modelKey] as {
    findMany: (args: { where: { tenantId: string } }) => Promise<unknown[]>;
    deleteMany: (args: { where: { tenantId: string } }) => Promise<{ count: number }>;
    createMany: (args: { data: unknown[]; skipDuplicates?: boolean }) => Promise<{ count: number }>;
  };
}

/**
 * Exporta TODOS os dados do tenant. Mantem User/Employee/Subscription/Farm
 * fora do dump — o backup eh apenas dos dados operacionais.
 */
export async function exportTenantBackup(tenantId: string): Promise<TenantBackup> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, name: true }
  });
  if (!tenant) throw new Error("Tenant nao encontrado.");

  const tables: Record<string, unknown[]> = {};
  for (const key of RESTORE_ORDER) {
    const rows = await modelDelegate(key).findMany({ where: { tenantId } });
    tables[key] = rows;
  }

  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    tenantId,
    tenantName: tenant.name,
    tables
  };
}

/**
 * Apaga todos os dados operacionais/catalogo/financeiro do tenant.
 * Usa transaction pra atomicidade. NAO mexe em User, EmployeeAccount,
 * Subscription, PaymentEvent, AuditLog, Farm, Tenant.
 */
export async function wipeTenantData(tenantId: string, actorUserId: string | null) {
  const counts: Record<string, number> = {};

  await prisma.$transaction(
    async (tx) => {
      for (const key of WIPE_ORDER) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const delegate = (tx as any)[key] as {
          deleteMany: (args: { where: { tenantId: string } }) => Promise<{ count: number }>;
        };
        const result = await delegate.deleteMany({ where: { tenantId } });
        counts[key] = result.count;
      }
    },
    { timeout: 60000, maxWait: 10000 }
  );

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId: actorUserId ?? undefined,
      action: "TENANT_WIPE",
      entity: "Tenant",
      entityId: tenantId,
      after: { counts }
    }
  });

  return counts;
}

/**
 * Restaura um backup. Wipe antes de inserir pra garantir estado limpo.
 * Falhas no meio do restore explodem a transaction inteira.
 */
export async function restoreTenantBackup(
  tenantId: string,
  actorUserId: string | null,
  backup: TenantBackup
) {
  if (backup.version !== BACKUP_VERSION) {
    throw new Error(`Versao do backup (${backup.version}) incompativel. Esperado: ${BACKUP_VERSION}.`);
  }
  if (backup.tenantId !== tenantId) {
    throw new Error(
      `Backup eh de outro criatorio (tenant ${backup.tenantId.slice(0, 8)}...). So da pra restaurar no proprio.`
    );
  }

  const counts: Record<string, number> = {};

  await prisma.$transaction(
    async (tx) => {
      // 1. WIPE primeiro
      for (const key of WIPE_ORDER) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const delegate = (tx as any)[key] as {
          deleteMany: (args: { where: { tenantId: string } }) => Promise<{ count: number }>;
        };
        await delegate.deleteMany({ where: { tenantId } });
      }

      // 2. RESTORE em ordem forward
      for (const key of RESTORE_ORDER) {
        const rows = backup.tables[key];
        if (!Array.isArray(rows) || rows.length === 0) {
          counts[key] = 0;
          continue;
        }

        // Garante tenantId correto e converte datas (JSON traz como string)
        const sanitized = rows.map((row) => normalizeRow(row, tenantId));

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const delegate = (tx as any)[key] as {
          createMany: (args: { data: unknown[]; skipDuplicates?: boolean }) => Promise<{ count: number }>;
        };
        const result = await delegate.createMany({ data: sanitized, skipDuplicates: true });
        counts[key] = result.count;
      }
    },
    { timeout: 120000, maxWait: 15000 }
  );

  await prisma.auditLog.create({
    data: {
      tenantId,
      userId: actorUserId ?? undefined,
      action: "TENANT_RESTORE",
      entity: "Tenant",
      entityId: tenantId,
      after: { counts, sourceExportedAt: backup.exportedAt }
    }
  });

  return counts;
}

// Helpers de normalizacao — JSON nao tem Date nem Decimal nativo.
// Prisma aceita strings ISO pra DateTime e strings/numbers pra Decimal,
// entao deixa passar. Tenant ID eh forcado pro tenant atual pra evitar
// que alguem cole backup adulterado com outro tenantId.

type RowLike = Record<string, unknown>;

function normalizeRow(row: unknown, tenantId: string): RowLike {
  if (!row || typeof row !== "object") return {};
  const copy: RowLike = { ...(row as RowLike) };
  copy.tenantId = tenantId;
  return copy;
}

// Type guards pra validar o JSON de upload antes de restaurar.
export function isValidBackupShape(value: unknown): value is TenantBackup {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  if (obj.version !== BACKUP_VERSION) return false;
  if (typeof obj.exportedAt !== "string") return false;
  if (typeof obj.tenantId !== "string") return false;
  if (!obj.tables || typeof obj.tables !== "object") return false;
  return true;
}

// Tipo auxiliar pra evitar import direto (TS infere de Prisma).
export type _PrismaTx = Prisma.TransactionClient;
