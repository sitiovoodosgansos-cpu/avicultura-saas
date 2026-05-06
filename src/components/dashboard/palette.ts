// Constantes neutras (sem "use client") pra serem importaveis tanto em
// Server quanto em Client Components. Re-exportadas pelo _chart-foundation.

export const CHART_PALETTE = {
  emerald: { from: "#34d399", to: "#059669", accent: "#10b981" },
  amber:   { from: "#fbbf24", to: "#d97706", accent: "#f59e0b" },
  orange:  { from: "#fb923c", to: "#ea580c", accent: "#f97316" },
  indigo:  { from: "#818cf8", to: "#4f46e5", accent: "#6366f1" },
  rose:    { from: "#fb7185", to: "#e11d48", accent: "#f43f5e" },
  pink:    { from: "#f472b6", to: "#db2777", accent: "#ec4899" },
  violet:  { from: "#c084fc", to: "#9333ea", accent: "#a855f7" },
  sky:     { from: "#7dd3fc", to: "#0284c7", accent: "#38bdf8" },
  teal:    { from: "#5eead4", to: "#0d9488", accent: "#14b8a6" },
  slate:   { from: "#cbd5e1", to: "#64748b", accent: "#94a3b8" }
} as const;

export type PaletteKey = keyof typeof CHART_PALETTE;

export const CATEGORICAL_PALETTE: PaletteKey[] = [
  "emerald", "indigo", "amber", "violet", "sky", "rose", "teal", "orange", "pink", "slate"
];
