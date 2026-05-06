"use client";

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

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

export function HeatmapCard({
  title,
  subtitle,
  data,
  palette,
  icon,
  days = 60,
  emptyMessage = "Sem dados pra exibir ainda."
}: HeatmapCardProps) {
  const c = CHART_PALETTE[palette];
  const isEmpty = data.length === 0 || data.every((d) => !d.value);

  // Index dos valores por YYYY-MM-DD pra lookup rapido
  const byDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of data) map.set(d.date, d.value);
    return map;
  }, [data]);

  const max = useMemo(() => Math.max(1, ...data.map((d) => d.value)), [data]);

  // Constroi a grade de dias: comeca no domingo da semana de (hoje - days)
  // pra alinhar bem visualmente. Cada coluna = 1 semana, 7 linhas = dias.
  const grid = useMemo(() => buildGrid(days), [days]);

  // Total + media pra mostrar no rodape
  const total = data.reduce((s, d) => s + d.value, 0);
  const activeDays = data.filter((d) => d.value > 0).length;
  const avg = activeDays > 0 ? total / activeDays : 0;

  function colorFor(v: number) {
    if (!v) return "#f1f5f9"; // slate-50 (vazio)
    const ratio = v / max;
    const opacity =
      ratio >= 0.85 ? 1 : ratio >= 0.65 ? 0.78 : ratio >= 0.4 ? 0.55 : ratio >= 0.2 ? 0.36 : 0.18;
    return `${c.accent}${Math.round(opacity * 255).toString(16).padStart(2, "0")}`;
  }

  // Semanas onde o mes muda - pra desenhar label no topo
  const monthLabels = useMemo(() => {
    const labels: { col: number; month: number }[] = [];
    let lastMonth = -1;
    for (let col = 0; col < grid.length; col++) {
      const week = grid[col];
      const firstDay = week.find((d) => d !== null);
      if (!firstDay) continue;
      const m = firstDay.getMonth();
      if (m !== lastMonth) {
        labels.push({ col, month: m });
        lastMonth = m;
      }
    }
    return labels;
  }, [grid]);

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
          <div className="flex h-full flex-col">
            <div className="flex flex-1 items-center justify-center overflow-x-auto">
              <HeatmapGrid
                grid={grid}
                byDay={byDay}
                colorFor={colorFor}
                monthLabels={monthLabels}
              />
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
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
                    style={{
                      backgroundColor: `${c.accent}${Math.round(a * 255).toString(16).padStart(2, "0")}`
                    }}
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

// Grid: array de SEMANAS (cada semana = array de 7 Date|null, dom→sab).
// A primeira semana pode ter null nos dias antes do startDate.
function buildGrid(days: number): Array<Array<Date | null>> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - (days - 1));

  // Volta ate o domingo da semana do start
  const firstSun = new Date(start);
  firstSun.setDate(firstSun.getDate() - firstSun.getDay());

  const weeks: Array<Array<Date | null>> = [];
  const cursor = new Date(firstSun);
  while (cursor <= today) {
    const week: Array<Date | null> = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(cursor);
      if (d < start || d > today) week.push(null);
      else week.push(new Date(d));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

function HeatmapGrid({
  grid,
  byDay,
  colorFor,
  monthLabels
}: {
  grid: Array<Array<Date | null>>;
  byDay: Map<string, number>;
  colorFor: (v: number) => string;
  monthLabels: { col: number; month: number }[];
}) {
  const CELL = 22;
  const GAP = 4;
  const LABEL_TOP = 18;
  const LABEL_LEFT = 26;
  const cols = grid.length;
  const width = LABEL_LEFT + cols * (CELL + GAP);
  const height = LABEL_TOP + 7 * (CELL + GAP);

  return (
    <svg width={width} height={height} className="font-sans">
      {/* Month labels no topo */}
      {monthLabels.map((m, i) => (
        <text
          key={i}
          x={LABEL_LEFT + m.col * (CELL + GAP)}
          y={11}
          fontSize={10}
          fontWeight={600}
          fill="#64748b"
        >
          {MONTHS[m.month]}
        </text>
      ))}

      {/* Weekday labels (so segunda, quarta, sexta pra nao poluir) */}
      {[1, 3, 5].map((row) => (
        <text
          key={row}
          x={0}
          y={LABEL_TOP + row * (CELL + GAP) + 11}
          fontSize={9}
          fill="#94a3b8"
        >
          {WEEKDAYS[row]}
        </text>
      ))}

      {/* Cells */}
      {grid.map((week, col) =>
        week.map((day, row) => {
          if (!day) {
            return (
              <rect
                key={`${col}-${row}`}
                x={LABEL_LEFT + col * (CELL + GAP)}
                y={LABEL_TOP + row * (CELL + GAP)}
                width={CELL}
                height={CELL}
                rx={3}
                fill="transparent"
              />
            );
          }
          const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
          const value = byDay.get(key) ?? 0;
          const dateLabel = day.toLocaleDateString("pt-BR");
          return (
            <rect
              key={`${col}-${row}`}
              x={LABEL_LEFT + col * (CELL + GAP)}
              y={LABEL_TOP + row * (CELL + GAP)}
              width={CELL}
              height={CELL}
              rx={3}
              fill={colorFor(value)}
              stroke="#ffffff"
              strokeWidth={1}
            >
              <title>{value > 0 ? `${dateLabel}: ${value} ovos` : `${dateLabel}: sem coleta`}</title>
            </rect>
          );
        })
      )}
    </svg>
  );
}
