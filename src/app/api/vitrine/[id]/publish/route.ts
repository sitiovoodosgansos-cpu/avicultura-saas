import { NextRequest, NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import {
  publishListingToOrnamarket,
  unpublishListingFromOrnamarket
} from "@/lib/vitrine/ornamarket-publish";

const SKIP_MESSAGES: Record<string, string> = {
  ALREADY_PUBLISHED: "Já publicado no OrnaMarket. Despublique antes de publicar de novo.",
  NO_PHOTO: "Adicione uma foto da ave antes de publicar.",
  NO_PRICE: "Cadastre o preço para a idade atual antes de publicar.",
  NOT_FOUND: "Anúncio não encontrado."
};

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getApiSessionOr401({ employeePermission: "vitrine" });
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const result = await publishListingToOrnamarket(auth.session.user.tenantId, id);
    if (result.kind === "skipped") {
      const status = result.reason === "NOT_FOUND" ? 404 : 400;
      return NextResponse.json(
        { error: SKIP_MESSAGES[result.reason] ?? "Não foi possível publicar." },
        { status }
      );
    }
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao publicar.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getApiSessionOr401({ employeePermission: "vitrine" });
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const result = await unpublishListingFromOrnamarket(auth.session.user.tenantId, id);
    if (!result.ok) {
      return NextResponse.json({ error: "Anúncio não encontrado." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao despublicar.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
