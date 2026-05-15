"use client";

import type { ReactNode } from "react";
import { BirdStatus } from "@prisma/client";

// ---------- Tipos compartilhados ----------

export type PlantelBird = {
  id: string;
  ringNumber: string;
  nickname: string | null;
  bayNumber: number | null;
  sex: "FEMALE" | "MALE" | "UNKNOWN";
  status: BirdStatus;
  origin: string | null;
  acquisitionDate: string | null;
  purchaseValue: string | number | null;
  flockGroupId: string;
  inVitrine: boolean;
};

export type PlantelGroup = {
  id: string;
  title: string;
  notes: string | null;
  bayNumber: number;
  matrixCount: number;
  reproducerCount: number;
  species: { name: string };
  breed: { name: string };
  variety: { name: string } | null;
  summary: {
    totalBirds: number;
    females: number;
    males: number;
    daughters: number;
    daughtersAlive: number;
    ACTIVE: number;
    SICK: number;
    DEAD: number;
    BROODY: number;
    revenue: number;
  };
  birds: PlantelBird[];
  lastVaccination: { vaccineName: string; appliedAt: string } | null;
};

export type BirdHistory = {
  id: string;
  fromStatus: BirdStatus | null;
  toStatus: BirdStatus;
  reason: string | null;
  createdAt: string;
};

export type GroupForm = {
  species: string;
  breed: string;
  variety: string;
  title: string;
  bayNumber: number;
  matrixCount: number;
  reproducerCount: number;
  expectedLayCapacity?: number;
  purchaseInvestmentTotal?: number;
  notes: string;
};

export type BirdForm = {
  flockGroupId: string;
  bayNumber?: number;
  ringNumber: string;
  nickname: string;
  sex: "FEMALE" | "MALE" | "UNKNOWN";
  acquisitionDate: string;
  purchaseValue?: number;
  origin: string;
  status: BirdStatus;
};

export type PlantelResponse = {
  groups: PlantelGroup[];
  growth: {
    byMonth: Array<{ key: string; label: string; total: number }>;
    byYear: Array<{ key: string; label: string; total: number }>;
  };
};

export type WorkerLink = {
  id: string;
  label: string;
  token: string;
  isActive: boolean;
  createdAt: string;
  allowPlantel: boolean;
  allowEggs: boolean;
  allowIncubators: boolean;
  allowHealth: boolean;
};

export type ExpandFilter = "all" | "female" | "male" | "active" | "sick" | "dead";

// ---------- Constantes de UI ----------

export const selectClass =
  "h-11 w-full rounded-2xl border border-[color:var(--line)] bg-white/90 px-4 text-sm text-slate-800 outline-none focus:ring-4 focus:ring-[color:var(--brand)]/20";

export const textareaClass =
  "min-h-24 w-full rounded-2xl border border-[color:var(--line)] bg-white/90 px-4 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:ring-4 focus:ring-[color:var(--brand)]/20";

export const statusLabel: Record<BirdStatus, string> = {
  ACTIVE: "Ativa",
  SICK: "Doente",
  DEAD: "Morta",
  BROODY: "Choca",
  SOLD: "Vendida"
};

export const statusBadge: Record<BirdStatus, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700",
  SICK: "bg-amber-100 text-amber-700",
  DEAD: "bg-rose-100 text-rose-700",
  BROODY: "bg-sky-100 text-sky-700",
  SOLD: "bg-violet-100 text-violet-700"
};

export const statusEmoji: Record<BirdStatus, string> = {
  ACTIVE: "✅",
  SICK: "🤒",
  DEAD: "💀",
  BROODY: "🥚",
  SOLD: "💰"
};

export const STATUS_ICON_ORDER: BirdStatus[] = ["ACTIVE", "SICK", "BROODY", "DEAD"];

export const expandedFilterLabel: Record<ExpandFilter, string> = {
  all: "Todas as aves",
  female: "Matrizes (fêmeas)",
  male: "Reprodutores (machos)",
  active: "Ativas",
  sick: "Doentes",
  dead: "Mortas"
};

export const emptyGroupForm: GroupForm = {
  species: "",
  breed: "",
  variety: "",
  title: "",
  bayNumber: 1,
  matrixCount: 0,
  reproducerCount: 0,
  notes: ""
};

export const emptyBirdForm: BirdForm = {
  flockGroupId: "",
  bayNumber: 1,
  ringNumber: "",
  nickname: "",
  sex: "UNKNOWN",
  acquisitionDate: "",
  origin: "",
  status: "ACTIVE"
};

// ---------- Helpers puros ----------

export function toDateInput(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function applyExpandedFilter(birds: PlantelBird[], filter: ExpandFilter): PlantelBird[] {
  if (filter === "female") return birds.filter((b) => b.sex === "FEMALE");
  if (filter === "male") return birds.filter((b) => b.sex === "MALE");
  if (filter === "active") return birds.filter((b) => b.status === "ACTIVE");
  if (filter === "sick") return birds.filter((b) => b.status === "SICK");
  if (filter === "dead") return birds.filter((b) => b.status === "DEAD");
  return birds;
}

// ---------- Componentes UI puros ----------

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-semibold text-slate-800">{label}</span>
      {children}
    </label>
  );
}

export function StatChip({ emoji, label, value }: { emoji: string; label: string; value: number }) {
  return (
    <div className="flex min-h-[72px] flex-col justify-between rounded-xl bg-[color:var(--surface-soft)] px-3 py-2 sm:min-h-[82px] sm:px-3 sm:py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 sm:text-[11px]">
        {emoji} {label}
      </p>
      <p className="mt-0.5 text-[34px] font-semibold leading-none text-slate-900 sm:text-[30px]">{value}</p>
    </div>
  );
}

export function CompactStatChip({
  emoji,
  label,
  value,
  onClick,
  // Permite valores nao-numericos (ex: 'R$ 1,2k' pra faturamento) — quando
  // textual, reduz font-size pra caber sem truncar.
  textValue
}: {
  emoji: string;
  label: string;
  value: number;
  onClick?: () => void;
  textValue?: string;
}) {
  const baseClass =
    "flex h-full min-h-[84px] w-full min-w-0 flex-col items-center justify-center rounded-xl bg-slate-50 px-2 py-2 text-center sm:min-h-[92px]";
  const display = textValue ?? value;
  const valueClass = textValue
    ? "mt-1 text-[16px] font-semibold leading-tight text-slate-900 sm:text-[18px]"
    : "mt-1 text-[28px] font-semibold leading-none text-slate-900 sm:text-[30px]";
  const content = (
    <>
      <p className="max-w-full truncate text-[11px] leading-tight text-slate-500 sm:text-[12px]">
        {emoji} {label}
      </p>
      <p className={valueClass}>{display}</p>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${baseClass} cursor-pointer transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]/30`}
      >
        {content}
      </button>
    );
  }

  return <div className={baseClass}>{content}</div>;
}
