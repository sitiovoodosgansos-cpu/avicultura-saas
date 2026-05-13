// Lista unica de paginas vinculaveis a tarefas. Espelha o nav lateral
// (src/components/layout/app-nav.tsx). Reusada por dropdown do form,
// sininho, popover e modal — manter sincronizada com app-nav.tsx.
export const TASK_PAGES = [
  { key: "dashboard", label: "Dashboard", emoji: "🏠", href: "/dashboard" },
  { key: "plantel", label: "Plantel", emoji: "🦚", href: "/plantel" },
  { key: "coleta-ovos", label: "Coleta", emoji: "🥚", href: "/coleta-ovos" },
  { key: "prateleira", label: "Prateleira", emoji: "🪺", href: "/prateleira" },
  { key: "chocadeiras", label: "Chocadeiras", emoji: "🐣", href: "/chocadeiras" },
  { key: "vitrine", label: "Vitrine", emoji: "🏪", href: "/vitrine" },
  { key: "sanidade", label: "Sanidade", emoji: "💊", href: "/sanidade" },
  { key: "financeiro", label: "Financeiro", emoji: "💰", href: "/financeiro" },
  { key: "crm", label: "CRM", emoji: "📋", href: "/crm" },
  { key: "perfil", label: "Perfil", emoji: "⚙️", href: "/perfil" }
] as const;

export type TaskPageKey = (typeof TASK_PAGES)[number]["key"];

const PAGE_KEYS = TASK_PAGES.map((p) => p.key) as readonly TaskPageKey[];

export function isTaskPageKey(value: string): value is TaskPageKey {
  return (PAGE_KEYS as readonly string[]).includes(value);
}

const PAGE_BY_KEY = new Map(TASK_PAGES.map((p) => [p.key, p]));

export function getTaskPage(key: TaskPageKey) {
  return PAGE_BY_KEY.get(key)!;
}

/**
 * Converte um pathname (ex: "/plantel", "/plantel/edit/123") em TaskPageKey.
 * Retorna null se a rota nao corresponde a uma pagina vinculavel.
 */
export function pathnameToPageKey(pathname: string): TaskPageKey | null {
  // Primeiro segmento da URL (ignora query/hash)
  const seg = pathname.split("?")[0].split("#")[0].split("/").filter(Boolean)[0];
  if (!seg) return null;
  return isTaskPageKey(seg) ? (seg as TaskPageKey) : null;
}
