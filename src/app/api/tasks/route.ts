import { NextRequest, NextResponse } from "next/server";
import { getApiSessionOr401 } from "@/lib/auth/api-session";
import { taskCreateSchema } from "@/lib/validators/tasks";
import { createTask, listActiveTasks, type Actor } from "@/lib/tasks/service";
import { isTaskPageKey } from "@/lib/tasks/pages";

export async function GET(request: NextRequest) {
  const auth = await getApiSessionOr401();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const pageKeyRaw = searchParams.get("pageKey");
  const includeCompleted = searchParams.get("includeCompleted") === "true";
  const pageKey = pageKeyRaw && isTaskPageKey(pageKeyRaw) ? pageKeyRaw : undefined;

  const tasks = await listActiveTasks(auth.session.user.tenantId, {
    pageKey,
    includeCompleted
  });
  return NextResponse.json({ tasks });
}

export async function POST(request: NextRequest) {
  const auth = await getApiSessionOr401();
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const parsed = taskCreateSchema.safeParse(body);
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

  const created = await createTask(auth.session.user.tenantId, actor, parsed.data);
  return NextResponse.json(created, { status: 201 });
}
