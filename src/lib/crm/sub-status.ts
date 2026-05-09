// Sub-status (sub-fase dentro de cada coluna do Kanban). Lista controlada
// no client — schema do banco guarda como string livre pra permitir
// customizacao futura sem migracao.

import type { LeadStage } from "@prisma/client";

export type SubStatusOption = {
  value: string;
  label: string;
  emoji: string;
};

export const SUB_STATUS_BY_STAGE: Record<LeadStage, SubStatusOption[]> = {
  NOVO_CONTATO: [
    { value: "aguardando_resposta", label: "Aguardando resposta inicial", emoji: "👋" },
    { value: "pediu_info", label: "Pediu informações", emoji: "📝" },
    { value: "pediu_preco", label: "Pediu preço", emoji: "💰" }
  ],
  EM_NEGOCIACAO: [
    { value: "proposta_enviada", label: "Proposta enviada", emoji: "📤" },
    { value: "proposta_aceita", label: "Proposta aceita (aguardando pagamento)", emoji: "👍" },
    { value: "negociando_condicoes", label: "Negociando condições", emoji: "🤝" },
    { value: "aguardando_decisao", label: "Aguardando decisão", emoji: "⏳" }
  ],
  EM_ESPERA: [
    { value: "esperando_botar", label: "Esperando galinha começar a botar", emoji: "🥚" },
    { value: "esperando_nascer", label: "Esperando pintinho nascer", emoji: "🐣" },
    { value: "esperando_temporada", label: "Esperando temporada", emoji: "📅" },
    { value: "outro_motivo_espera", label: "Outro motivo de espera", emoji: "⏰" }
  ],
  COMPROU: [
    { value: "separar_pedido", label: "Separar pedido", emoji: "📦" },
    { value: "enviado", label: "Enviado", emoji: "🚚" },
    { value: "entregue", label: "Entregue", emoji: "📬" },
    { value: "recebido", label: "Recebido (cliente confirmou)", emoji: "✨" }
  ],
  DESISTIU: [
    { value: "sumiu", label: "Sumiu (não responde)", emoji: "👻" },
    { value: "achou_caro", label: "Achou caro", emoji: "💸" },
    { value: "sem_estrutura", label: "Sem estrutura ainda", emoji: "🏗️" },
    { value: "comprou_de_outro", label: "Comprou de outro", emoji: "🔄" },
    { value: "vai_comprar_futuro", label: "Vai comprar no futuro", emoji: "📅" },
    { value: "nao_quer_mais", label: "Não quer mais", emoji: "🚫" }
  ]
};

export function findSubStatus(stage: LeadStage, value: string | null | undefined): SubStatusOption | null {
  if (!value) return null;
  return SUB_STATUS_BY_STAGE[stage].find((s) => s.value === value) ?? null;
}

// Stage labels + cores (usado em multiplos lugares)
export const STAGE_META: Record<LeadStage, { label: string; emoji: string; columnAccent: string; chip: string }> = {
  NOVO_CONTATO: {
    label: "Novo contato",
    emoji: "🆕",
    columnAccent: "border-sky-300 bg-sky-50/40",
    chip: "bg-sky-100 text-sky-700"
  },
  EM_NEGOCIACAO: {
    label: "Em negociação",
    emoji: "💬",
    columnAccent: "border-amber-300 bg-amber-50/40",
    chip: "bg-amber-100 text-amber-700"
  },
  EM_ESPERA: {
    label: "Em espera",
    emoji: "⏸️",
    columnAccent: "border-violet-300 bg-violet-50/30",
    chip: "bg-violet-100 text-violet-700"
  },
  COMPROU: {
    label: "Comprou",
    emoji: "✅",
    columnAccent: "border-yellow-400 bg-gradient-to-br from-amber-50 to-yellow-100/60 shadow-[0_0_25px_rgba(234,179,8,0.15)]",
    chip: "bg-yellow-200 text-amber-900"
  },
  DESISTIU: {
    label: "Desistiu",
    emoji: "❌",
    columnAccent: "border-rose-200 bg-rose-50/30",
    chip: "bg-rose-100 text-rose-700"
  }
};

// Ordem visual no Kanban. Em Espera entre Negociação e Comprou:
// fluxo natural quando o cliente fechou interesse mas precisa esperar
// produção (botar / chocar / temporada).
export const STAGES_ORDER: LeadStage[] = [
  "NOVO_CONTATO",
  "EM_NEGOCIACAO",
  "EM_ESPERA",
  "COMPROU",
  "DESISTIU"
];

// Stages que NÃO esquentam/esfriam nem são arquivados automaticamente.
// COMPROU já tem fluxo próprio de pós-venda; EM_ESPERA é parking
// intencional (esperando produção do criador).
export const STAGES_WITHOUT_TEMPERATURE: LeadStage[] = ["COMPROU", "EM_ESPERA"];

// Canais
export const CHANNEL_META: Record<string, { label: string; emoji: string }> = {
  WHATSAPP: { label: "WhatsApp", emoji: "📱" },
  OLX: { label: "OLX", emoji: "🛒" },
  INSTAGRAM: { label: "Instagram", emoji: "📷" },
  TIKTOK: { label: "TikTok", emoji: "🎵" },
  ORNAMARKET: { label: "OrnaMarket", emoji: "🐾" },
  SITE: { label: "Site", emoji: "🌐" },
  ADS_OFFLINE: { label: "Publicidade offline", emoji: "📢" },
  INDICACAO: { label: "Indicação", emoji: "👥" },
  OUTRO: { label: "Outro", emoji: "➕" }
};

export const INTEREST_META: Record<string, { label: string; emoji: string }> = {
  AVES: { label: "Aves", emoji: "🐦" },
  OVOS: { label: "Ovos férteis", emoji: "🥚" },
  MAMIFEROS: { label: "Mamíferos", emoji: "🐰" },
  OUTROS: { label: "Outros", emoji: "🐠" }
};
