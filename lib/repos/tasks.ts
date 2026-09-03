import "server-only";

import { and, asc, desc, eq, ne, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { projects, tasks } from "@/lib/db/schema";

export type TaskView =
  | "today"
  | "overdue"
  | "upcoming"
  | "by-project"
  | "by-priority"
  | "completed"
  | "all";

export interface TaskListItem {
  id: string;
  title: string;
  status: string;
  priority: string | null;
  dueDate: string | null;
  sourceKind: string | null;
  projectId: string | null;
  projectNumber: string | null;
  projectName: string | null;
}

// A due date in the Vault can be "2026-08-21" or "08/21/2026" — normalize.
function normalizeDue(raw: string | null): string | null {
  if (!raw) return null;
  const s = raw.trim();
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) return `${mdy[3]}-${mdy[1].padStart(2, "0")}-${mdy[2].padStart(2, "0")}`;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return iso ? `${iso[1]}-${iso[2]}-${iso[3]}` : null;
}

export async function listTasks(opts: {
  view?: TaskView;
  projectId?: string;
}): Promise<TaskListItem[]> {
  const view = opts.view ?? "all";

  const rows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      sourceKind: tasks.sourceKind,
      projectId: tasks.projectId,
      projectNumber: projects.number,
      projectName: projects.name,
    })
    .from(tasks)
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .where(
      and(
        opts.projectId ? eq(tasks.projectId, opts.projectId) : undefined,
        view === "completed" ? eq(tasks.status, "done") : ne(tasks.status, "done"),
      ),
    )
    .orderBy(desc(tasks.priority), asc(tasks.dueDate), asc(tasks.createdAt));

  const today = new Date().toISOString().slice(0, 10);
  const dueOf = (r: (typeof rows)[number]) => normalizeDue(r.dueDate);

  let filtered = rows;
  if (view === "today") {
    filtered = rows.filter((r) => {
      const d = dueOf(r);
      return d != null && d <= today;
    });
  } else if (view === "overdue") {
    filtered = rows.filter((r) => {
      const d = dueOf(r);
      return d != null && d < today;
    });
  } else if (view === "upcoming") {
    filtered = rows.filter((r) => {
      const d = dueOf(r);
      return d != null && d > today;
    });
  }

  if (view === "by-priority") {
    const rank: Record<string, number> = { critical: 0, high: 1, normal: 2, medium: 2, low: 3 };
    filtered = [...filtered].sort(
      (a, b) => (rank[a.priority ?? ""] ?? 4) - (rank[b.priority ?? ""] ?? 4),
    );
  }

  return filtered;
}

export async function taskCounts(): Promise<Record<string, number>> {
  const [row] = await db
    .select({
      open: sql<number>`count(*) filter (where ${tasks.status} <> 'done')`.mapWith(Number),
      done: sql<number>`count(*) filter (where ${tasks.status} = 'done')`.mapWith(Number),
      withProject: sql<number>`count(*) filter (where ${tasks.projectId} is not null)`.mapWith(Number),
    })
    .from(tasks);
  return row ?? { open: 0, done: 0, withProject: 0 };
}
