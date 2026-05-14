import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { updateSpeciesIncubationDays } from "@/lib/incubators/service";

// Aceita 1..120 dias OR null pra resetar pro fallback. Limites
// generosos cobrindo desde codorna (~17) ate emu (~52) com folga.
const updateSchema = z.object({
  incubationDays: z
    .union([z.number().int().min(1).max(120), z.null()])
    .describe("Dias de incubacao ou null pra usar fallback")
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getApiSessionOr401({ employeePermission: "incubators" });
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados invalidos." },
      { status: 400 }
    );
  }

  const updated = await updateSpeciesIncubationDays(
    auth.session.user.tenantId,
    id,
    parsed.data.incubationDays
  );
  if (!updated) {
    return NextResponse.json({ error: "Especie nao encontrada." }, { status: 404 });
  }
  return NextResponse.json(updated);
}
