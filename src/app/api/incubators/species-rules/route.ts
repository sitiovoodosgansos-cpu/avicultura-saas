import { NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { listIncubationSpecies } from "@/lib/incubators/service";

// Lista especies do tenant que tem grupo do Plantel ativo (exclui
// Chocada/Recria), com o periodo de eclosao configurado (ou null =
// usa fallback por keyword). Usado pelo modal 'Tabela de eclosao'
// na pagina de chocadeiras.
export async function GET() {
  const auth = await getApiSessionOr401({ employeePermission: "incubators" });
  if (!auth.ok) return auth.response;

  const species = await listIncubationSpecies(auth.session.user.tenantId);
  return NextResponse.json({ species });
}
