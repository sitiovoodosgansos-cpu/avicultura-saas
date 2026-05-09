// Temperatura do lead — calculada SEMPRE no client a partir de
// lastInteractionAt. Cards na coluna COMPROU ignoram (sempre dourado).

export type Temperature = "hot" | "warm" | "cold" | "frozen";

export function daysSince(date: string | Date): number {
  const ms = Date.now() - new Date(date).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function temperatureFor(lastInteractionAt: string | Date): Temperature {
  const d = daysSince(lastInteractionAt);
  if (d <= 2) return "hot";
  if (d <= 5) return "warm";
  if (d <= 7) return "cold";
  return "frozen"; // dia 8+ = arquiva auto pelo cron
}

// CSS classes pra cor + barra
export type TempStyle = {
  cardBorder: string;
  cardBg: string;
  bar: string;
  chip: string;
  label: string;
};

export const TEMPERATURE_STYLES: Record<Temperature, TempStyle> = {
  hot: {
    cardBorder: "border-emerald-300",
    cardBg: "bg-white",
    bar: "bg-emerald-500",
    chip: "bg-emerald-100 text-emerald-700",
    label: "Quente"
  },
  warm: {
    cardBorder: "border-amber-300",
    cardBg: "bg-amber-50/30",
    bar: "bg-amber-500",
    chip: "bg-amber-100 text-amber-800",
    label: "Morno"
  },
  cold: {
    cardBorder: "border-rose-300",
    cardBg: "bg-rose-50/40",
    bar: "bg-rose-500",
    chip: "bg-rose-100 text-rose-700",
    label: "Frio"
  },
  frozen: {
    cardBorder: "border-zinc-300",
    cardBg: "bg-zinc-50",
    bar: "bg-zinc-400",
    chip: "bg-zinc-200 text-zinc-700",
    label: "Esfriou demais"
  }
};

// Emoji que substitui o avatar de iniciais no card (mais visual, scan rapido)
export const TEMPERATURE_EMOJI: Record<Temperature, string> = {
  hot: "🟢",
  warm: "🟡",
  cold: "🔴",
  frozen: "⚪"
};

// Progresso da barra (0..100). 0d = 0%, 7d = 100%, depois trava em 100.
export function temperatureProgress(lastInteractionAt: string | Date): number {
  const d = daysSince(lastInteractionAt);
  return Math.min(100, Math.max(0, (d / 7) * 100));
}
