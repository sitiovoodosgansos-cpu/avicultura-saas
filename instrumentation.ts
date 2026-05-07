// Roda uma vez antes da app inicializar (Next.js feature).
// Usado pra setar timezone do Node pro horario de Brasilia, ja que
// a Vercel roda funcoes em UTC por padrao e isso fazia datas
// (especialmente as de coleta de ovos / heatmap calendar) ficarem
// off-by-one quando o usuario coletava perto da meia-noite.
export function register() {
  process.env.TZ = "America/Sao_Paulo";
}
