import { NextResponse } from "next/server";

import { requireApiSession } from "@/lib/auth/session";
import { listTasks, taskCounts, type TaskView } from "@/lib/repos/tasks";

export const dynamic = "force-dynamic";

const VIEWS: TaskView[] = [
  "today",
  "overdue",
  "upcoming",
  "by-project",
  "by-priority",
  "completed",
  "all",
];

export async function GET(req: Request) {
  const unauth = await requireApiSession();
  if (unauth) return unauth;

  const url = new URL(req.url);
  const viewParam = url.searchParams.get("view");
  const view = VIEWS.includes(viewParam as TaskView) ? (viewParam as TaskView) : "all";
  const projectId = url.searchParams.get("projectId") ?? undefined;

  const [tasks, counts] = await Promise.all([
    listTasks({ view, projectId }),
    taskCounts(),
  ]);
  return NextResponse.json({ view, tasks, counts });
}
