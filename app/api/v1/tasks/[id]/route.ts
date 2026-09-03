import { NextResponse } from "next/server";

import { requireApiSession } from "@/lib/auth/session";
import { updateTask, type TaskAction } from "@/lib/repos/tasks";

export const dynamic = "force-dynamic";

const ACTIONS: TaskAction[] = ["approve", "dismiss", "complete", "reopen", "edit"];

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const unauth = await requireApiSession();
  if (unauth) return unauth;

  const { id } = await ctx.params;
  let body: { action?: string; title?: string; dueDate?: string | null; priority?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed body" }, { status: 400 });
  }

  if (!body.action || !ACTIONS.includes(body.action as TaskAction)) {
    return NextResponse.json({ error: `action must be one of ${ACTIONS.join(", ")}` }, { status: 400 });
  }

  const ok = await updateTask(id, body.action as TaskAction, {
    title: body.title,
    dueDate: body.dueDate,
    priority: body.priority,
  });
  if (!ok) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
