import "server-only";

import { and, desc, eq, inArray, or, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  activity,
  communications,
  contacts,
  documents,
  knowledgeNotes,
  links,
  meetings,
  projects,
  tasks,
} from "@/lib/db/schema";

export type ProjectRow = typeof projects.$inferSelect;

export interface ProjectListItem extends ProjectRow {
  openTasks: number;
  emails: number;
  meetings: number;
}

// --- native project creation (no Vault note) -----------------------------

export interface NewProjectInput {
  number: string;
  name: string;
  status?: string | null;
  addressLine?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  projectType?: string | null;
  scopeOfWork?: string | null;
  currentPhase?: string | null;
  priority?: string | null;
  client?: string | null;
  architect?: string | null;
  projectManager?: string | null;
  disciplines?: string[];
  ahj?: string | null;
  permitNumber?: string | null;
  permitStatus?: string | null;
  startDate?: string | null;
  targetDate?: string | null;
  nextAction?: string | null;
  nextActionDue?: string | null;
  health?: string | null;
}

export type CreateProjectResult =
  | { ok: true; id: string; number: string }
  | { ok: false; error: string; field?: string };

const NATIVE_SOURCE = "core-engine";

function trimOrNull(s?: string | null): string | null {
  const v = (s ?? "").trim();
  return v === "" ? null : v;
}

export async function createProject(
  input: NewProjectInput,
  actor = "operator",
): Promise<CreateProjectResult> {
  const number = (input.number ?? "").trim();
  const name = (input.name ?? "").trim();
  if (!number) return { ok: false, error: "Project number is required.", field: "number" };
  if (!name) return { ok: false, error: "Project name is required.", field: "name" };
  if (number.length > 40) return { ok: false, error: "Project number is too long.", field: "number" };

  const clash = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.number, number))
    .limit(1);
  if (clash.length) {
    return { ok: false, error: `Project ${number} already exists.`, field: "number" };
  }

  const now = new Date();
  const disciplines = (input.disciplines ?? [])
    .map((d) => d.trim())
    .filter(Boolean);

  try {
    return await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(projects)
        .values({
          number,
          name,
          status: trimOrNull(input.status) ?? "active",
          currentPhase: trimOrNull(input.currentPhase),
          priority: trimOrNull(input.priority),
          health: trimOrNull(input.health),
          projectType: trimOrNull(input.projectType),
          scopeOfWork: trimOrNull(input.scopeOfWork),
          addressLine: trimOrNull(input.addressLine),
          city: trimOrNull(input.city),
          state: trimOrNull(input.state),
          zip: trimOrNull(input.zip),
          client: trimOrNull(input.client),
          architect: trimOrNull(input.architect),
          projectManager: trimOrNull(input.projectManager),
          ahj: trimOrNull(input.ahj),
          permitNumber: trimOrNull(input.permitNumber),
          permitStatus: trimOrNull(input.permitStatus),
          disciplines,
          startDate: trimOrNull(input.startDate),
          targetDate: trimOrNull(input.targetDate),
          nextAction: trimOrNull(input.nextAction),
          nextActionDue: trimOrNull(input.nextActionDue),
          // native origin — never a Vault import
          sourceType: NATIVE_SOURCE,
          sourcePath: null,
          sourceHash: null,
          raw: null,
          importedAt: null,
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: projects.id, number: projects.number });

      const nextAction = trimOrNull(input.nextAction);
      if (nextAction) {
        await tx.insert(tasks).values({
          title: nextAction,
          status: "open",
          priority: trimOrNull(input.priority),
          dueDate: trimOrNull(input.nextActionDue),
          projectId: row.id,
          sourceKind: "project_next_action",
          sourceEntityType: "project",
          sourceEntityId: row.id,
          sourceType: NATIVE_SOURCE,
          // unique per project — the task natural key is (sourceType, sourcePath, sourceLine)
          sourcePath: `project/${row.id}/next-action`,
          sourceLine: null,
          extractionConfidence: null,
          reviewRequired: false,
          reviewStatus: null,
          importedAt: null,
          createdAt: now,
          updatedAt: now,
        });
      }

      await tx.insert(activity).values({
        actor,
        actorKind: "person",
        verb: "created",
        entityType: "project",
        entityId: row.id,
        projectId: row.id,
        summary: `Project ${row.number} created in Core Engine`,
        occurredAt: now,
      });

      return { ok: true as const, id: row.id, number: row.number };
    });
  } catch (err) {
    // Drizzle wraps the driver error; the PG error (code 23505 = unique_violation)
    // is on `.cause`. A concurrent create can race us to the same number.
    const e = err as { code?: string; message?: string; cause?: { code?: string } };
    const code = e?.code ?? e?.cause?.code;
    if (code === "23505" || /duplicate key|unique constraint/i.test(String(e?.message ?? ""))) {
      return { ok: false, error: `Project ${number} already exists.`, field: "number" };
    }
    console.error("[createProject] failed:", e?.message ?? err);
    return { ok: false, error: "Could not create the project. Please try again." };
  }
}

export async function listProjects(): Promise<ProjectListItem[]> {
  // Drop the verbose frontmatter dump + hash from the list payload.
  const rows = (await db.select().from(projects).orderBy(projects.number)).map(
    (r) => ({ ...r, raw: null, sourceHash: null }),
  );

  const counts = await db
    .select({
      projectId: tasks.projectId,
      openTasks: sql<number>`count(*) filter (where ${tasks.status} <> 'done')`.mapWith(Number),
    })
    .from(tasks)
    .groupBy(tasks.projectId);
  const taskByProject = new Map(counts.map((c) => [c.projectId, c.openTasks]));

  const emailCounts = await db
    .select({
      projectId: communications.projectId,
      n: sql<number>`count(*)`.mapWith(Number),
    })
    .from(communications)
    .groupBy(communications.projectId);
  const emailByProject = new Map(emailCounts.map((c) => [c.projectId, c.n]));

  const meetingCounts = await db
    .select({
      projectId: meetings.projectId,
      n: sql<number>`count(*)`.mapWith(Number),
    })
    .from(meetings)
    .groupBy(meetings.projectId);
  const meetingByProject = new Map(meetingCounts.map((c) => [c.projectId, c.n]));

  return rows.map((p) => ({
    ...p,
    openTasks: taskByProject.get(p.id) ?? 0,
    emails: emailByProject.get(p.id) ?? 0,
    meetings: meetingByProject.get(p.id) ?? 0,
  }));
}

async function resolveProject(idOrNumber: string): Promise<ProjectRow | null> {
  const isUuid = /^[0-9a-f-]{36}$/i.test(idOrNumber);
  const [row] = await db
    .select()
    .from(projects)
    .where(isUuid ? eq(projects.id, idOrNumber) : eq(projects.number, idOrNumber))
    .limit(1);
  return row ?? null;
}

export interface ProjectBundle {
  project: ProjectRow;
  tasks: (typeof tasks.$inferSelect)[];
  meetings: (typeof meetings.$inferSelect)[];
  communications: (typeof communications.$inferSelect)[];
  knowledge: (typeof knowledgeNotes.$inferSelect)[];
  documents: (typeof documents.$inferSelect)[];
  team: {
    contact: typeof contacts.$inferSelect;
    relation: string;
    origin: string | null;
  }[];
  activity: (typeof activity.$inferSelect)[];
}

export async function getProjectBundle(
  idOrNumber: string,
): Promise<ProjectBundle | null> {
  const project = await resolveProject(idOrNumber);
  if (!project) return null;
  const pid = project.id;

  const [projTasks, projMeetings, projComms, projActivity] = await Promise.all([
    db.select().from(tasks).where(eq(tasks.projectId, pid)).orderBy(tasks.status, desc(tasks.priority)),
    db.select().from(meetings).where(eq(meetings.projectId, pid)).orderBy(desc(meetings.startsAt)),
    db.select().from(communications).where(eq(communications.projectId, pid)).orderBy(desc(communications.receivedAt)),
    db.select().from(activity).where(eq(activity.projectId, pid)).orderBy(desc(activity.occurredAt)).limit(50),
  ]);

  // team + knowledge + documents via the links table
  const projLinks = await db
    .select()
    .from(links)
    .where(
      or(
        and(eq(links.fromType, "project"), eq(links.fromId, pid)),
        and(eq(links.toType, "project"), eq(links.toId, pid)),
      ),
    );

  const contactIds = new Set<string>();
  const contactRel = new Map<string, { relation: string; origin: string | null }>();
  const knowledgeIds = new Set<string>();
  const documentIds = new Set<string>();
  for (const l of projLinks) {
    const other = l.fromType === "project" ? { type: l.toType, id: l.toId } : { type: l.fromType, id: l.fromId };
    if (other.type === "contact") {
      contactIds.add(other.id);
      contactRel.set(other.id, { relation: l.relation, origin: l.origin });
    } else if (other.type === "knowledge") knowledgeIds.add(other.id);
    else if (other.type === "document") documentIds.add(other.id);
  }

  const [teamRows, knowledgeRows, docRows] = await Promise.all([
    contactIds.size
      ? db.select().from(contacts).where(inArray(contacts.id, [...contactIds]))
      : Promise.resolve([]),
    knowledgeIds.size
      ? db.select().from(knowledgeNotes).where(inArray(knowledgeNotes.id, [...knowledgeIds]))
      : Promise.resolve([]),
    // documents also carry a direct FK
    db
      .select()
      .from(documents)
      .where(
        documentIds.size
          ? or(eq(documents.projectId, pid), inArray(documents.id, [...documentIds]))
          : eq(documents.projectId, pid),
      ),
  ]);

  return {
    project,
    tasks: projTasks,
    meetings: projMeetings,
    communications: projComms,
    knowledge: knowledgeRows,
    documents: docRows,
    team: teamRows.map((c) => ({
      contact: c,
      relation: contactRel.get(c.id)?.relation ?? "related_to",
      origin: contactRel.get(c.id)?.origin ?? null,
    })),
    activity: projActivity,
  };
}
