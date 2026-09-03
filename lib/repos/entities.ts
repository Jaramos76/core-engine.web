import "server-only";

import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  communications,
  contacts,
  documents,
  ideas,
  knowledgeNotes,
  links,
  projects,
} from "@/lib/db/schema";

// --- knowledge ----------------------------------------------------------

export async function listKnowledge() {
  const rows = await db.select().from(knowledgeNotes).orderBy(knowledgeNotes.kind, knowledgeNotes.title);
  const projByKnowledge = await linkedProjects("knowledge", rows.map((r) => r.id));
  return rows.map((r) => ({ ...r, projects: projByKnowledge.get(r.id) ?? [] }));
}

export async function getKnowledge(id: string) {
  const [row] = await db.select().from(knowledgeNotes).where(eq(knowledgeNotes.id, id)).limit(1);
  if (!row) return null;
  const proj = await linkedProjects("knowledge", [id]);
  return { ...row, projects: proj.get(id) ?? [] };
}

// --- contacts ---------------------------------------------------------

export async function listContacts() {
  const rows = await db.select().from(contacts).orderBy(desc(contacts.isConsultant), contacts.name);
  const projByContact = await linkedProjects("contact", rows.map((r) => r.id));
  return rows.map((r) => ({ ...r, projects: projByContact.get(r.id) ?? [] }));
}

// --- ideas ----------------------------------------------------------

export async function listIdeas() {
  const rows = await db.select().from(ideas).orderBy(ideas.maturity, ideas.title);
  const related = await db
    .select()
    .from(links)
    .where(or(and(eq(links.fromType, "idea")), and(eq(links.toType, "idea"))));
  const relCount = new Map<string, number>();
  for (const l of related) {
    const id = l.fromType === "idea" ? l.fromId : l.toId;
    relCount.set(id, (relCount.get(id) ?? 0) + 1);
  }
  return rows.map((r) => ({ ...r, relationCount: relCount.get(r.id) ?? 0 }));
}

// --- communications ------------------------------------------------

export async function listCommunications(opts?: { q?: string; needsReply?: boolean }) {
  const rows = await db
    .select({
      id: communications.id,
      subject: communications.subject,
      fromName: communications.fromName,
      fromEmail: communications.fromEmail,
      receivedAt: communications.receivedAt,
      category: communications.category,
      priority: communications.priority,
      actionRequired: communications.actionRequired,
      status: communications.status,
      projectId: communications.projectId,
      projectNumber: projects.number,
      projectName: projects.name,
    })
    .from(communications)
    .leftJoin(projects, eq(communications.projectId, projects.id))
    .where(
      and(
        opts?.q ? ilike(communications.subject, `%${opts.q}%`) : undefined,
        opts?.needsReply ? eq(communications.actionRequired, true) : undefined,
      ),
    )
    .orderBy(desc(communications.receivedAt));
  return rows;
}

// --- documents -----------------------------------------------------

export async function listDocuments() {
  const rows = await db
    .select({
      id: documents.id,
      title: documents.title,
      docType: documents.docType,
      sizeBytes: documents.sizeBytes,
      sha256: documents.sha256,
      filePath: documents.filePath,
      sourceType: documents.sourceType,
      fileModifiedAt: documents.fileModifiedAt,
      projectId: documents.projectId,
      projectNumber: projects.number,
      projectName: projects.name,
    })
    .from(documents)
    .leftJoin(projects, eq(documents.projectId, projects.id))
    .orderBy(desc(documents.projectId), documents.docType, documents.title);
  return rows;
}

// --- shared helper --------------------------------------------------

async function linkedProjects(
  entityType: string,
  ids: string[],
): Promise<Map<string, { id: string; number: string; name: string }[]>> {
  const out = new Map<string, { id: string; number: string; name: string }[]>();
  if (ids.length === 0) return out;

  const rows = await db
    .select({ link: links, project: projects })
    .from(links)
    .innerJoin(
      projects,
      or(
        and(eq(links.fromType, "project"), eq(links.fromId, projects.id)),
        and(eq(links.toType, "project"), eq(links.toId, projects.id)),
      ),
    )
    .where(
      or(
        and(eq(links.fromType, entityType), inArray(links.fromId, ids)),
        and(eq(links.toType, entityType), inArray(links.toId, ids)),
      ),
    );

  for (const { link, project } of rows) {
    const entityId = link.fromType === entityType ? link.fromId : link.toId;
    const list = out.get(entityId) ?? [];
    if (!list.some((p) => p.id === project.id)) {
      list.push({ id: project.id, number: project.number, name: project.name });
    }
    out.set(entityId, list);
  }
  return out;
}

export async function homeSummary() {
  const [projStats] = await db
    .select({
      total: sql<number>`count(*)`.mapWith(Number),
      atRisk: sql<number>`count(*) filter (where ${projects.health} in ('yellow','at-risk'))`.mapWith(Number),
      blocked: sql<number>`count(*) filter (where ${projects.health} in ('red','blocked'))`.mapWith(Number),
    })
    .from(projects);
  return { projects: projStats ?? { total: 0, atRisk: 0, blocked: 0 } };
}
