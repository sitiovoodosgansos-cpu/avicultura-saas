"use client";

import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { CHART_PALETTE, CATEGORICAL_PALETTE, type PaletteKey } from "./palette";

// Re-exporta pra manter compat com imports antigos
export { CHART_PALETTE, CATEGORICAL_PALETTE };
export type { PaletteKey };

// Defs SVG de gradients reutilizaveis. Cada chart inclui seu proprio
// id via `<ChartGradients id="meu-chart" palette="emerald" />`.
export function ChartGradients({ id, palette }: { id: string; palette: PaletteKey }) {
  const c = CHART_PALETTE[palette];
  return (
    <defs>
      {/* Vertical pra area fill abaixo de linhas */}
      <linearGradient id={`${id}-area`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={c.accent} stopOpacity={0.32} />
        <stop offset="100%" stopColor={c.accent} stopOpacity={0} />
      </linearGradient>
      {/* Vertical pra bars verticais */}
      <linearGradient id={`${id}-bar`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={c.from} stopOpacity={1} />
        <stop offset="100%" stopColor={c.to} stopOpacity={0.9} />
      </linearGradient>
      {/* Horizontal pra bars horizontais */}
      <linearGradient id={`${id}-barH`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor={c.from} stopOpacity={0.55} />
        <stop offset="100%" stopColor={c.to} stopOpacity={1} />
      </linearGradient>
      {/* Radial pra donut/pie */}
      <radialGradient id={`${id}-radial`} cx="50%" cy="50%" r="65%">
        <stop offset="0%" stopColor={c.from} stopOpacity={0.95} />
        <stop offset="100%" stopColor={c.to} stopOpacity={1} />
      </radialGradient>
    </defs>
  );
}

// Tooltip glassmorphism pra todos os charts
type TooltipPayloadItem = {
  value?: number | string;
  name?: string;
  color?: string;
  fill?: string;
  payload?: Record<string, unknown>;
};
export function CustomTooltip({
  active,
  payload,
  label,
  formatter,
  labelFormatter
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
  formatter?: (value: number, name?: string) => string;
  labelFormatter?: (label: string | number) => string;
}) {
  if (!active || !payload?.length) return null;
  const items = payload.filter((p) => p.value !== undefined && p.value !== null);
  if (items.length === 0) return null;

  return (
    <div className="rounded-2xl border border-white/60 bg-white/85 px-3 py-2 text-xs shadow-[0_8px_30px_rgba(15,23,42,0.12)] backdrop-blur-md">
      {label !== undefined && label !== "" ? (
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          {labelFormatter ? labelFormatter(label) : label}
        </p>
      ) : null}
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <span
            className="block h-2 w-2 rounded-full"
            style={{ backgroundColor: item.color || item.fill || "#94a3b8" }}
          />
          {item.name ? <span className="text-slate-600">{item.name}:</span> : null}
          <span className="font-semibold text-slate-900 tabular-nums">
            {formatter && typeof item.value === "number"
              ? formatter(item.value, item.name)
              : String(item.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// Estado vazio bonito pra quando o chart nao tem dados
export function EmptyChart({ icon, message }: { icon?: ReactNode; message: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 text-slate-300">
        {icon ?? <span className="text-2xl">📊</span>}
      </div>
      <p className="max-w-xs text-xs leading-relaxed text-slate-400">{message}</p>
    </div>
  );
}

// Shell consistente pra todo chart card. Header com icone gradiente.
export function ChartCardShell({
  title,
  subtitle,
  palette,
  icon,
  rightSlot,
  children,
  className = ""
}: {
  title: string;
  subtitle?: string;
  palette: PaletteKey;
  icon: ReactNode;
  rightSlot?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const c = CHART_PALETTE[palette];
  return (
    <Card className={`relative overflow-hidden transition-shadow hover:shadow-[0_12px_40px_rgba(15,23,42,0.08)] ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
            style={{ background: `linear-gradient(135deg, ${c.from} 0%, ${c.to} 100%)` }}
          >
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold tracking-tight text-slate-900 sm:text-base">{title}</h3>
            {subtitle ? (
              <p className="mt-0.5 text-[11px] text-slate-500 sm:text-xs">{subtitle}</p>
            ) : null}
          </div>
        </div>
        {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
      </div>
      {children}
    </Card>
  );
}
