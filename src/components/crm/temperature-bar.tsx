"use client";

import {
  TEMPERATURE_STYLES,
  daysSince,
  temperatureFor,
  temperatureProgress
} from "@/lib/crm/temperature";

export function TemperatureBar({
  lastInteractionAt,
  hidden = false
}: {
  lastInteractionAt: string | Date;
  /** Cards na coluna COMPROU passam hidden=true (sem temperatura) */
  hidden?: boolean;
}) {
  if (hidden) return null;
  const temp = temperatureFor(lastInteractionAt);
  const styles = TEMPERATURE_STYLES[temp];
  const pct = temperatureProgress(lastInteractionAt);
  const d = daysSince(lastInteractionAt);
  // So a indicacao de tempo "X dias parado" — sem rotulo Quente/Morno/Frio
  // (a cor da barra + emoji no avatar ja comunicam temperatura).
  const tempLabel = d === 0 ? "movido hoje" : d === 1 ? "1 dia parado" : `${d} dias parado`;
  return (
    <div className="mt-1.5">
      <div className="flex items-center justify-end text-[9px] text-zinc-500">
        <span>{tempLabel}</span>
      </div>
      <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-zinc-100">
        <div className={`h-full transition-all ${styles.bar}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
