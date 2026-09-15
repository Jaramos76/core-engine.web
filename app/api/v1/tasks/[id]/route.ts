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

  const origin=req.headers.get('origin');
  if(origin&&new URL(origin).host!==req.headers.get('host'))return NextResponse.json({error:'Origin not allowed'},{status:403});
  const { id } = await ctx.params;
  let body: { action?: string; title?: string; dueDate?: string | null; priority?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed body" }, { status: 400 });
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({error:'Invalid task fields'},{status:400});
  if(body.title!==undefined&&(typeof body.title!=='string'||!body.title.trim()||body.title.length>500))return NextResponse.json({error:'Title must contain 1–500 characters'},{status:400});
  if(body.dueDate!==undefined&&body.dueDate!==null&&(typeof body.dueDate!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(body.dueDate)||!Number.isFinite(Date.parse(body.dueDate))||new Date(body.dueDate).toISOString().slice(0,10)!==body.dueDate))return NextResponse.json({error:'Invalid due date'},{status:400});
  if(body.priority!==undefined&&body.priority!==null&&(typeof body.priority!=='string'||body.priority.length>50))return NextResponse.json({error:'Invalid priority'},{status:400});
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
