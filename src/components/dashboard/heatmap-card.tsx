"use client";

import CalendarHeatmap from "react-calendar-heatmap";
import "react-calendar-heatmap/dist/styles.css";
import { ReactNode, useMemo } from "react";
import {
  CHART_PALETTE,
  ChartCardShell,
  EmptyChart,
  type PaletteKey
} from "./_chart-foundation";

type HeatmapDatum = { date: string; value: number }; // date = YYYY-MM-DD

type HeatmapCardProps = {
  title: string;
  subtitle: string;
  data: HeatmapDatum[];
  palette: PaletteKey;
  icon: ReactNode;
  /** janela em dias mostrada (default 60) */
  days?: number;
  emptyMessage?: string;
};

export function HeatmapCard({
  title,
  subtitle,
  data,
  palette,
  icon,
  days = 60,
  emptyMessage = "Sem dados pra exibir ainda."
}: HeatmapCardProps) {
  const isEmpty = data.length === 0 || data.every((d) => !d.value);
  const c = CHART_PALETTE[palette];

  const endDate = useMemo(() => new Date(), []);
  const startDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d;
  }, [days]);

  const max = useMemo(() => Math.max(1, ...data.map((d) => d.value)), [data]);

  function classForValue(v: { value?: number } | undefined) {
    if (!v || !v.value) return "fill-slate-100";
    const ratio = v.value / max;
    if (ratio >= 0.85) return "heatmap-l5";
    if (ratio >= 0.65) return "heatmap-l4";
    if (ratio >= 0.4) return "heatmap-l3";
    if (ratio >= 0.2) return "heatmap-l2";
    return "heatmap-l1";
  }

  // Total e media pra mostrar como hint no rodape
  const total = data.reduce((s, d) => s + d.value, 0);
  const activeDays = data.filter((d) => d.value > 0).length;
  const avg = activeDays > 0 ? total / activeDays : 0;

  return (
    <ChartCardShell
      title={title}
      subtitle={subtitle}
      palette={palette}
      icon={icon}
      rightSlot={
        !isEmpty ? (
          <div className="flex flex-col items-end text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Total {days}d
            </p>
            <p className="text-base font-semibold tabular-nums text-slate-900">{total}</p>
          </div>
        ) : null
      }
    >
      <div className="h-64 w-full">
        {isEmpty ? (
          <EmptyChart icon={icon} message={emptyMessage} />
        ) : (
          <div className="ornabird-heatmap flex h-full flex-col">
            <style>{`
              .ornabird-heatmap .react-calendar-heatmap { font-family: inherit; }
              .ornabird-heatmap .react-calendar-heatmap text { font-size: 6px !important; fill: #94a3b8 !important; }
              .ornabird-heatmap .react-calendar-heatmap .react-calendar-heatmap-month-label { font-size: 7px !important; fill: #64748b !important; font-weight: 600 !important; }
              .ornabird-heatmap .react-calendar-heatmap .react-calendar-heatmap-weekday-label { font-size: 6px !important; fill: #94a3b8 !important; }
              .ornabird-heatmap .react-calendar-heatmap rect { rx: 2; ry: 2; stroke: #ffffff; stroke-width: 1; }
              .ornabird-heatmap .react-calendar-heatmap .heatmap-l1 { fill: ${hexAlpha(c.accent, 0.18)} !important; }
              .ornabird-heatmap .react-calendar-heatmap .heatmap-l2 { fill: ${hexAlpha(c.accent, 0.36)} !important; }
              .ornabird-heatmap .react-calendar-heatmap .heatmap-l3 { fill: ${hexAlpha(c.accent, 0.55)} !important; }
              .ornabird-heatmap .react-calendar-heatmap .heatmap-l4 { fill: ${hexAlpha(c.accent, 0.78)} !important; }
              .ornabird-heatmap .react-calendar-heatmap .heatmap-l5 { fill: ${c.accent} !important; }
              .ornabird-heatmap .react-calendar-heatmap .fill-slate-100 { fill: #f1f5f9 !important; }
            `}</style>
            <div className="flex-1">
              <CalendarHeatmap
                startDate={startDate}
                endDate={endDate}
                values={data as { date: string; value: number }[]}
                classForValue={(v) => classForValue(v as unknown as { value?: number } | undefined)}
                showWeekdayLabels
                titleForValue={(v) => {
                  const val = v as unknown as { date?: string; value?: number } | undefined;
                  if (!val || !val.value) return "Sem coleta";
                  return `${val.date}: ${val.value} ovos`;
                }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
              <div>
                <span className="font-semibold tabular-nums text-slate-900">{activeDays}</span>{" "}
                dias com coleta · média{" "}
                <span className="font-semibold tabular-nums text-slate-900">
                  {avg.toFixed(1)}
                </span>{" "}
                ovos/dia
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-400">Menos</span>
                {[0.18, 0.36, 0.55, 0.78, 1].map((a, i) => (
                  <span
                    key={i}
                    className="block h-2.5 w-2.5 rounded-sm"
                    style={{ backgroundColor: hexAlpha(c.accent, a) }}
                  />
                ))}
                <span className="text-[10px] text-slate-400">Mais</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </ChartCardShell>
  );
}

function hexAlpha(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255).toString(16).padStart(2, "0");
  return `${hex}${a}`;
}
