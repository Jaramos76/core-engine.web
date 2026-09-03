import "server-only";

import { and, asc, desc, eq, ne, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { communications, projects, tasks } from "@/lib/db/schema";

export type TaskView =
  | "today"
  | "overdue"
  | "upcoming"
  | "by-project"
  | "by-priority"
  | "review"
  | "completed"
  | "all";

export interface TaskListItem {
  id: string;
  title: string;
  status: string;
  priority: string | null;
  dueDate: string | null;
  sourceKind: string | null;
  extractionConfidence: number | null;
  reviewRequired: boolean;
  reviewStatus: string | null;
  projectId: string | null;
  projectNumber: string | null;
  projectName: string | null;
  sourceEntityType: string | null;
  sourceEntityId: string | null;
  sourceEmailSubject: string | null;
}

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
      extractionConfidence: tasks.extractionConfidence,
      reviewRequired: tasks.reviewRequired,
      reviewStatus: tasks.reviewStatus,
      projectId: tasks.projectId,
      projectNumber: projects.number,
      projectName: projects.name,
      sourceEntityType: tasks.sourceEntityType,
      sourceEntityId: tasks.sourceEntityId,
      sourceEmailSubject: communications.subject,
    })
    .from(tasks)
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .leftJoin(communications, eq(tasks.sourceEntityId, communications.id))
    .where(
      and(
        opts.projectId ? eq(tasks.projectId, opts.projectId) : undefined,
        view === "completed"
          ? eq(tasks.status, "done")
          : view === "review"
            ? and(eq(tasks.reviewRequired, true), eq(tasks.reviewStatus, "pending"))
            : and(
                ne(tasks.status, "done"),
                // NULL review_status means "not a review task" — keep it.
                sql`coalesce(${tasks.reviewStatus}, '') <> 'dismissed'`,
              ),
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
      open: sql<number>`count(*) filter (where ${tasks.status} <> 'done' and coalesce(${tasks.reviewStatus},'') <> 'dismissed')`.mapWith(Number),
      done: sql<number>`count(*) filter (where ${tasks.status} = 'done')`.mapWith(Number),
      review: sql<number>`count(*) filter (where ${tasks.reviewRequired} and ${tasks.reviewStatus} = 'pending')`.mapWith(Number),
      dismissed: sql<number>`count(*) filter (where ${tasks.reviewStatus} = 'dismissed')`.mapWith(Number),
    })
    .from(tasks);
  return row ?? { open: 0, done: 0, review: 0, dismissed: 0 };
}

export type TaskAction = "approve" | "dismiss" | "complete" | "reopen" | "edit";

export async function updateTask(
  id: string,
  action: TaskAction,
  patch?: { title?: string; dueDate?: string | null; priority?: string | null },
): Promise<boolean> {
  const now = new Date();
  const set: Record<string, unknown> = { updatedAt: now };

  if (action === "approve") {
    set.reviewRequired = false;
    set.reviewStatus = "approved";
    set.reviewedAt = now;
  } else if (action === "dismiss") {
    set.reviewStatus = "dismissed";
    set.reviewedAt = now;
    set.status = "done"; // out of the active list; distinguishable by reviewStatus
  } else if (action === "complete") {
    set.status = "done";
    set.completedAt = now;
    if (patch == null) set.reviewStatus = "approved";
  } else if (action === "reopen") {
    set.status = "open";
    set.completedAt = null;
    set.reviewStatus = "approved";
  } else if (action === "edit") {
    if (patch?.title) set.title = patch.title.trim();
    if (patch?.dueDate !== undefined) set.dueDate = patch.dueDate;
    if (patch?.priority !== undefined) set.priority = patch.priority;
    set.reviewRequired = false;
    set.reviewStatus = "edited";
    set.reviewedAt = now;
  }

  const res = await db.update(tasks).set(set).where(eq(tasks.id, id)).returning({ id: tasks.id });
  return res.length > 0;
}
