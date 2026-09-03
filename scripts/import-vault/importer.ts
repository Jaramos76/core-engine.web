// Vault → Core Engine importer. Builds an in-memory plan from the Vault
// (read-only), then optionally applies it to Postgres. Idempotent: re-running
// updates rows by natural key rather than duplicating.

import { basename, join } from "node:path";
import { existsSync } from "node:fs";

import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import * as t from "../../lib/db/schema";
import { listMarkdown, parseNote, str } from "./reader";
import {
  bump,
  newPlan,
  resolvePendingLinks,
} from "./plan";
import {
  importConsultants,
  importDocumentCatalogs,
  importIdeas,
  importInboxEmails,
  importKnowledge,
  importProject,
} from "./collectors";
import type { Plan, Ref, Report } from "./types";

type Db = PostgresJsDatabase<typeof t>;

const PROJECTS_DIR = "01 Work/Projects";

function projectNoteFiles(vaultRoot: string): string[] {
  const dir = join(vaultRoot, PROJECTS_DIR);
  if (!existsSync(dir)) return [];
  return listMarkdown(dir).filter(
    (p) => str(parseNote(vaultRoot, p).frontmatter.type) === "project",
  );
}

function finalize(plan: Plan) {
  resolvePendingLinks(plan);
  // de-dupe links
  const seen = new Set<string>();
  plan.links = plan.links.filter((l) => {
    const k = `${l.from.type}:${l.from.key}|${l.to.type}:${l.to.key}|${l.relation}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const R = plan.report;
  R.detected.contacts = plan.contacts.size;
  R.detected.consultants = [...plan.contacts.values()].filter((c) => c.isConsultant).length;
  R.detected.tasks = plan.tasks.length;
  R.relationships = plan.links.length;
}

/** Single project (targeted re-import / testing). */
export function buildPlan(vaultRoot: string, opts: { projectQuery: string }): Plan {
  const plan = newPlan(`project:${opts.projectQuery}`, vaultRoot);
  const R = plan.report;
  const q = opts.projectQuery.toLowerCase();
  const match = projectNoteFiles(vaultRoot).filter((p) =>
    basename(p).toLowerCase().includes(q),
  );
  if (match.length === 0) {
    R.errors.push(`No project note matched "${opts.projectQuery}"`);
    return plan;
  }
  if (match.length > 1) {
    R.errors.push(
      `"${opts.projectQuery}" matched ${match.length}: ${match.map((m) => basename(m)).join(", ")}`,
    );
    return plan;
  }
  importProject(plan, vaultRoot, match[0]);
  importConsultants(plan, vaultRoot, { scopeKeys: new Set(plan.projects.keys()) });
  finalize(plan);
  return plan;
}

/** The whole work + knowledge system. */
export function buildFullPlan(vaultRoot: string): Plan {
  const plan = newPlan("full", vaultRoot);
  const files = projectNoteFiles(vaultRoot);

  // projects first (so emails / consultants / ideas can resolve to them)
  for (const abs of files) {
    try {
      importProject(plan, vaultRoot, abs);
    } catch (err) {
      plan.report.errors.push(`project ${basename(abs)}: ${(err as Error).message}`);
    }
  }

  importInboxEmails(plan, vaultRoot);
  importConsultants(plan, vaultRoot);
  importKnowledge(plan, vaultRoot);
  importIdeas(plan, vaultRoot);
  importDocumentCatalogs(plan, vaultRoot);

  finalize(plan);
  return plan;
}

// --- apply ----------------------------------------------------------------

export async function applyPlan(plan: Plan, database: Db): Promise<Report> {
  const R = plan.report;
  const ids: Record<string, Map<string, string>> = {
    project: new Map(),
    contact: new Map(),
    communication: new Map(),
    meeting: new Map(),
    knowledge: new Map(),
    idea: new Map(),
    document: new Map(),
  };
  const now = new Date();

  async function upsert(
    table: unknown,
    conflictTarget: unknown[],
    row: Record<string, unknown>,
  ): Promise<string> {
    const values: Record<string, unknown> = { ...row, importedAt: now, updatedAt: now };
    const set: Record<string, unknown> = {};
    for (const k of Object.keys(values)) {
      if (k === "id" || k === "createdAt") continue;
      set[k] = values[k];
    }
    const res = await database
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert(table as any)
      .values(values)
      .onConflictDoUpdate({ target: conflictTarget as never, set })
      .returning({ id: (table as { id: unknown }).id as never });
    return (res[0] as { id: string }).id;
  }

  for (const [key, row] of plan.projects) {
    ids.project.set(key, await upsert(t.projects, [t.projects.number], row));
    bump(R.imported, "projects");
  }
  for (const [key, row] of plan.contacts) {
    ids.contact.set(
      key,
      await upsert(t.contacts, [t.contacts.sourceType, t.contacts.sourcePath], row),
    );
    bump(R.imported, "contacts");
  }
  for (const [key, row] of plan.communications) {
    const link = plan.links.find(
      (l) => l.to.type === "communication" && l.to.key === key && l.from.type === "project",
    );
    const projectId = link ? ids.project.get(link.from.key) ?? null : null;
    ids.communication.set(
      key,
      await upsert(t.communications, [t.communications.providerId], { ...row, projectId }),
    );
    bump(R.imported, "communications");
  }
  for (const [key, row] of plan.meetings) {
    const link = plan.links.find(
      (l) => l.to.type === "meeting" && l.to.key === key && l.from.type === "project",
    );
    const projectId = link ? ids.project.get(link.from.key) ?? null : null;
    const mid = await upsert(
      t.meetings,
      [t.meetings.sourceType, t.meetings.sourcePath],
      { ...row, projectId },
    );
    ids.meeting.set(key, mid);
    bump(R.imported, "meetings");
    const extra = plan.meetingExtras.get(key);
    if (extra) {
      for (const name of extra.attendees) {
        await database.insert(t.meetingAttendees).values({ meetingId: mid, name }).onConflictDoNothing();
      }
      for (const d of extra.decisions) {
        await database.insert(t.decisions).values({ text: d, meetingId: mid, projectId });
      }
    }
  }
  for (const [key, row] of plan.knowledge) {
    ids.knowledge.set(
      key,
      await upsert(t.knowledgeNotes, [t.knowledgeNotes.sourceType, t.knowledgeNotes.sourcePath], row),
    );
    bump(R.imported, "knowledge");
  }
  for (const [key, row] of plan.ideas) {
    ids.idea.set(
      key,
      await upsert(t.ideas, [t.ideas.sourceType, t.ideas.sourcePath], row),
    );
    bump(R.imported, "ideas");
  }
  for (const [key, row] of plan.documents) {
    const link = plan.links.find(
      (l) => l.to.type === "document" && l.to.key === key && l.from.type === "project",
    );
    const projectId = link ? ids.project.get(link.from.key) ?? null : null;
    ids.document.set(key, await upsert(t.documents, [t.documents.sha256], { ...row, projectId }));
    bump(R.imported, "documents");
  }

  for (const stage of plan.tasks) {
    const projectId = stage.projectKey ? ids.project.get(stage.projectKey) ?? null : null;
    let sourceEntityId: string | null = null;
    if (stage.source) {
      const m = ids[stage.source.type];
      sourceEntityId = m?.get(stage.source.key) ?? null;
    }
    await database
      .insert(t.tasks)
      .values({
        title: stage.title,
        status: stage.status,
        priority: stage.priority,
        dueDate: stage.dueDate,
        projectId,
        sourceKind: stage.sourceKind,
        sourceEntityType: stage.source?.type ?? null,
        sourceEntityId,
        sourceLine: stage.sourceLine,
        extractionConfidence: stage.extractionConfidence,
        reviewRequired: stage.reviewRequired,
        reviewStatus: stage.reviewRequired ? "pending" : null,
        sourceType: stage.sourceType,
        sourcePath: stage.sourcePath,
        importedAt: now,
      })
      .onConflictDoUpdate({
        target: [t.tasks.sourceType, t.tasks.sourcePath, t.tasks.sourceLine],
        set: {
          title: stage.title,
          status: stage.status,
          projectId,
          extractionConfidence: stage.extractionConfidence,
          reviewRequired: stage.reviewRequired,
          updatedAt: now,
        },
      });
    bump(R.imported, "tasks");
  }

  const refId = (ref: Ref): string | null => ids[ref.type]?.get(ref.key) ?? null;
  for (const link of plan.links) {
    const fromId = refId(link.from);
    const toId = refId(link.to);
    if (!fromId || !toId) {
      R.warnings.push(`link dropped (${link.from.type}:${link.from.key} → ${link.to.type}:${link.to.key})`);
      continue;
    }
    await database
      .insert(t.links)
      .values({
        fromType: link.from.type,
        fromId,
        toType: link.to.type,
        toId,
        relation: link.relation,
        origin: link.origin,
        confidence: link.confidence ?? 1,
      })
      .onConflictDoNothing();
    bump(R.imported, "relationships");
  }

  for (const name of plan.tags) {
    await database.insert(t.tags).values({ name }).onConflictDoNothing();
  }

  await database.insert(t.importRuns).values({
    finishedAt: now,
    mode: "apply",
    scope: R.scope,
    vaultPath: R.vaultPath,
    report: R as unknown as Record<string, unknown>,
    ok: R.errors.length === 0,
  });

  for (const [pid] of ids.project) {
    const projectId = ids.project.get(pid)!;
    await database.insert(t.activity).values({
      actor: "vault-importer",
      actorKind: "system",
      verb: "imported",
      entityType: "project",
      entityId: projectId,
      projectId,
      summary: `Imported / refreshed from the Vault (${R.scope})`,
      payload: { scope: R.scope },
    });
  }

  return R;
}
