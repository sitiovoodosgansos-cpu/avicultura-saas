import { NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { prisma } from "@/lib/db/prisma";

// Endpoint leve pra hidratar o dropdown 'Item' no form de Nova Entrada
// quando a categoria for uma venda (EGG_SALE / CHICK_SALE /
// ADULT_BIRD_SALE). Permission scopa pra financeiro — diferente de
// /api/eggs/flock-groups que exige permission de ovos.
//
// Exclui grupos auxiliares (Chocada / Recria) que sao estagios
// transitorios e nao representam raca pra fins de relatorio financeiro.
export async function GET() {
  const auth = await getApiSessionOr401({ employeePermission: "financeiro" });
  if (!auth.ok) return auth.response;

  const groups = await prisma.flockGroup.findMany({
    where: {
      tenantId: auth.session.user.tenantId,
      NOT: {
        OR: [
          { title: { startsWith: "Chocada " } },
          { title: { startsWith: "Recria " } }
        ]
      }
    },
    select: { id: true, title: true },
    orderBy: { title: "asc" }
  });

  return NextResponse.json({ groups });
}
