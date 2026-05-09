// Tipos compartilhados pelos componentes do CRM. Espelham o que a API
// devolve em /api/crm/leads (Prisma include com financialEntry).

import type { LeadStage, LeadChannel, LeadInterestType } from "@prisma/client";

export type LeadFinancial = {
  id: string;
  amount: string | number; // Decimal vem como string em JSON
  category: string;
  date: string;
};

export type Lead = {
  id: string;
  tenantId: string;
  name: string;
  phone: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  avatarUrl: string | null;
  stage: LeadStage;
  subStatus: string | null;
  channel: LeadChannel;
  channelOther: string | null;
  interestType: LeadInterestType | null;
  interestText: string | null;
  observation: string | null;
  tags: string[];
  lastInteractionAt: string;
  archivedAt: string | null;
  archivedReason: string | null;
  position: number;
  financialEntryId: string | null;
  financialEntry: LeadFinancial | null;
  createdAt: string;
  updatedAt: string;
};

export type LeadHistoryItem = {
  id: string;
  type: string;
  fromValue: string | null;
  toValue: string | null;
  notes: string | null;
  actorUserId: string | null;
  createdAt: string;
};

export type CrmMetrics = {
  totalActive: number;
  byStage: Record<LeadStage, number>;
  conversion30d: number;
  ticketAverage: number;
  revenue30d: number;
  archivedCount: number;
  salesCount30d: number;
  archivedLast30: number;
  newToday: number;
  newLast30: number;
  newAvgPerDay30d: number;
};

export function leadInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "?";
}

export function whatsappLink(phone: string | null, name?: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  const greeting = name ? `Oi ${name.split(" ")[0]}, tudo bem?` : "Olá!";
  return `https://wa.me/${digits}?text=${encodeURIComponent(greeting)}`;
}
