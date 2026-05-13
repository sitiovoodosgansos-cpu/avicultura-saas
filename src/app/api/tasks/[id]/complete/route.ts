import { NextRequest, NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { taskCompleteSchema } from "@/lib/validators/tasks";
import { setTaskCompletion, type Actor } from "@/lib/tasks/service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getApiSessionOr401();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json();
  const parsed = taskCompleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados invalidos." },
      { status: 400 }
    );
  }

  const actor: Actor = {
    kind: auth.session.user.kind === "employee" ? "employee" : "owner",
    id: auth.session.user.id
  };

  const updated = await setTaskCompletion(
    auth.session.user.tenantId,
    id,
    actor,
    parsed.data.done
  );
  if (!updated) {
    return NextResponse.json({ error: "Tarefa nao encontrada." }, { status: 404 });
  }
  return NextResponse.json(updated);
}
