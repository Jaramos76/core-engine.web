// Vault → Core Engine importer. Builds an in-memory plan from the Vault
// (read-only), then optionally applies it to Postgres. Idempotent: re-running
// updates rows by natural key rather than duplicating.

import { basename, join } from "node:path";
import { existsSync, readFileSync } from "node:fs";

import * as t from "../../lib/db/schema";
import {
  bool,
  extractCheckboxes,
  extractWikilinks,
  listFiles,
  listMarkdown,
  parseNote,
  section,
  sha256,
  str,
  strArray,
  toDate,
  type Note,
} from "./reader";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import {
  classifyActionItem,
  emailStatus,
  isNavLink,
  looksLikePerson,
} from "./classify";

type Db = PostgresJsDatabase<typeof t>;

const PROJECTS_DIR = "01 Work/Projects";
const CONSULTANTS_DIR = "01 Work/Consultants";
const KNOWLEDGE_DIR = "03 Knowledge";
const DOC_FOLDERS = ["Drawings", "Permits", "Submittals", "Documents", "RFIs", "Photos", "CA"];

const DOC_TYPE_BY_FOLDER: Record<string, string> = {
  Drawings: "drawing",
  Permits: "permit",
  Submittals: "submittal",
  RFIs: "rfi",
  Documents: "document",
  Photos: "photo",
  CA: "report",
};

const MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  dwg: "image/vnd.dwg",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

// --- plan shapes ---------------------------------------------------------

type Ref = { type: string; key: string };

interface LinkStage {
  from: Ref;
  to: Ref;
  relation: string;
  origin: string;
  confidence?: number;
}

interface TaskStage {
  title: string;
  status: string;
  priority: string | null;
  dueDate: string | null;
  projectKey: string | null;
  sourceKind: string;
  source: Ref | null; // originating entity
  sourceType: string;
  sourcePath: string;
  sourceLine: number;
}

export interface Report {
  scope: string;
  vaultPath: string;
  filesScanned: number;
  detected: Record<string, number>;
  imported: Record<string, number>;
  relationships: number;
  tasksKept: number;
  tasksSkipped: { text: string; reason: string; source: string }[];
  warnings: string[];
  unmatched: string[];
  duplicates: string[];
  errors: string[];
}

export interface Plan {
  projects: Map<string, Record<string, unknown>>;
  contacts: Map<string, Record<string, unknown>>;
  communications: Map<string, Record<string, unknown>>;
  meetings: Map<string, Record<string, unknown>>;
  meetingExtras: Map<string, { attendees: string[]; decisions: string[] }>;
  knowledge: Map<string, Record<string, unknown>>;
  documents: Map<string, Record<string, unknown>>;
  tasks: TaskStage[];
  links: LinkStage[];
  tags: Set<string>;
  report: Report;
}

// --- helpers ----------------------------------------------------------

function emptyReport(scope: string, vaultPath: string): Report {
  return {
    scope,
    vaultPath,
    filesScanned: 0,
    detected: {},
    imported: {},
    relationships: 0,
    tasksKept: 0,
    tasksSkipped: [],
    warnings: [],
    unmatched: [],
    duplicates: [],
    errors: [],
  };
}

function bump(rec: Record<string, number>, key: string, by = 1) {
  rec[key] = (rec[key] ?? 0) + by;
}

function emailBody(note: Note): string {
  const msg = section(note.body, "Message");
  return msg || note.body.trim();
}

function emailSubject(note: Note): string {
  const h = note.body.match(/^#\s+(.+)$/m);
  if (h) return h[1].trim();
  return str(note.frontmatter.subject) ?? basename(note.relPath).replace(/\.md$/, "");
}

function normName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, "") // drop "(FigueroaAIAPA)"
    .replace(/,?\s*(aia|pa|pe|ra|llc|inc|p\.?a\.?)\b\.?/gi, "")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Add or merge a contact into the plan, identified by email if present else by
 * normalized name. Returns the stable plan key.
 */
function resolveContact(
  plan: Plan,
  fields: {
    name: string;
    email?: string | null;
    company?: string | null;
    role?: string | null;
    trade?: string | null;
    phone?: string | null;
    cell?: string | null;
    website?: string | null;
    licenseNumber?: string | null;
    fee?: string | null;
    isConsultant?: boolean;
    sourceType: string;
    sourcePath: string;
    sourceHash?: string;
    raw?: unknown;
  },
): string {
  const email = fields.email?.toLowerCase() || null;
  const nn = normName(fields.name);

  for (const [k, existing] of plan.contacts) {
    const exEmail = (existing.email as string | null)?.toLowerCase() || null;
    const exName = normName((existing.name as string) ?? "");
    if ((email && exEmail && email === exEmail) || (!email && nn && nn === exName) || (email && !exEmail && nn === exName)) {
      // merge — fill blanks, keep the richer source
      for (const [key, val] of Object.entries(fields)) {
        if (val == null || val === "") continue;
        if (existing[key] == null || existing[key] === "") existing[key] = val;
      }
      if (fields.isConsultant) existing.isConsultant = true;
      return k;
    }
  }
  const key = email ? `email:${email}` : `name:${nn}`;
  plan.contacts.set(key, { ...fields });
  return key;
}

// --- build plan -----------------------------------------------------

export function buildPlan(
  vaultRoot: string,
  opts: { projectQuery: string },
): Plan {
  const plan: Plan = {
    projects: new Map(),
    contacts: new Map(),
    communications: new Map(),
    meetings: new Map(),
    meetingExtras: new Map(),
    knowledge: new Map(),
    documents: new Map(),
    tasks: [],
    links: [],
    tags: new Set(),
    report: emptyReport(`project:${opts.projectQuery}`, vaultRoot),
  };
  const R = plan.report;

  // 1. locate the project note
  const projectsAbs = join(vaultRoot, PROJECTS_DIR);
  const q = opts.projectQuery.toLowerCase();
  const projectNoteFiles = existsSync(projectsAbs)
    ? listMarkdown(projectsAbs).filter(
        (p) => str(parseNote(vaultRoot, p).frontmatter.type) === "project",
      )
    : [];
  const match = projectNoteFiles.filter((p) =>
    basename(p).toLowerCase().includes(q),
  );
  if (match.length === 0) {
    R.errors.push(`No project note matched "${opts.projectQuery}"`);
    return plan;
  }
  if (match.length > 1) {
    R.errors.push(
      `"${opts.projectQuery}" matched ${match.length} projects: ${match
        .map((m) => basename(m))
        .join(", ")}`,
    );
    return plan;
  }

  const projectNote = parseNote(vaultRoot, match[0]);
  R.filesScanned += 1;
  const projectFolder = join(vaultRoot, projectNote.relPath, "..");
  const fm = projectNote.frontmatter;
  const number = str(fm.project_number) ?? basename(projectFolder).split(" ")[0];
  const projectKey = number;

  plan.projects.set(projectKey, {
    number,
    name: str(fm.project_name) ?? basename(projectFolder),
    status: str(fm.status),
    currentPhase: str(fm.current_phase),
    priority: str(fm.priority),
    health: str(fm.health),
    projectType: str(fm.project_type),
    scopeOfWork: str(fm.scope_of_work),
    addressLine: str(fm.address),
    city: str(fm.city),
    state: str(fm.state),
    zip: str(fm.zip),
    client: str(fm.client),
    architect: str(fm.architect),
    projectManager: str(fm.project_manager),
    ahj: str(fm.authority_having_jurisdiction),
    permitNumber: str(fm.permit_number),
    permitStatus: str(fm.permit_status),
    sewerAvailable: str(fm.sewer_available),
    septicSystem: str(fm.septic_system),
    disciplines: strArray(fm.disciplines),
    startDate: str(fm.start_date),
    targetDate: str(fm.target_date),
    nextAction: str(fm.next_action),
    nextActionDue: str(fm.next_action_due),
    lastUpdate: str(fm.last_update),
    sourceType: "vault-markdown",
    sourcePath: projectNote.relPath,
    sourceHash: projectNote.hash,
    raw: fm,
  });
  bump(R.detected, "projects");
  for (const tag of strArray(fm.tags)) plan.tags.add(tag);

  // 2. next action → task
  const nextAction = str(fm.next_action);
  if (nextAction) {
    plan.tasks.push({
      title: nextAction,
      status: "open",
      priority: str(fm.priority),
      dueDate: str(fm.next_action_due),
      projectKey,
      sourceKind: "project_next_action",
      source: { type: "project", key: projectKey },
      sourceType: "vault-markdown",
      sourcePath: projectNote.relPath,
      sourceLine: 0,
    });
  }

  // 3. emails (contacts derived from senders are created here first, so the
  //    architect below merges into an existing person rather than duplicating)
  const emailsDir = join(projectFolder, "Emails");
  for (const abs of existsSync(emailsDir) ? listMarkdown(emailsDir) : []) {
    R.filesScanned += 1;
    let note: Note;
    try {
      note = parseNote(vaultRoot, abs);
    } catch (err) {
      R.errors.push(`parse ${abs}: ${(err as Error).message}`);
      continue;
    }
    const efm = note.frontmatter;
    if (str(efm.type) !== "email") {
      R.warnings.push(`${note.relPath}: in Emails/ but type != email — skipped`);
      continue;
    }
    const providerId = str(efm.provider_id);
    if (!providerId) {
      R.warnings.push(`${note.relPath}: email has no provider_id — using path as key`);
    }
    const commKey = providerId ?? `path:${note.relPath}`;
    if (plan.communications.has(commKey)) {
      R.duplicates.push(`duplicate provider_id ${commKey} (${note.relPath})`);
      continue;
    }

    const fromEmail = str(efm.from_email);
    const fromName = str(efm.from_name);
    plan.communications.set(commKey, {
      providerId,
      messageId: str(efm.message_id),
      channel: "email",
      direction: "inbound",
      subject: emailSubject(note),
      fromName,
      fromEmail,
      toAddrs: str(efm.to),
      receivedAt: toDate(efm.received),
      category: str(efm.category),
      priority: str(efm.priority),
      actionRequired: bool(efm.action_required),
      status: emailStatus(str(efm.status)),
      bodyText: emailBody(note),
      triage: {
        raw: section(note.body, "Lola Triage"),
        project: str(efm.project),
        matchSource: str(efm.project_match_source),
      },
      projectConfidence: efm.project_confidence != null ? Number(efm.project_confidence) : null,
      sourceType: "vault-markdown",
      sourcePath: note.relPath,
      sourceHash: note.hash,
      raw: efm,
    });
    bump(R.detected, "communications");

    // project owns the email (folder location is ground truth here)
    plan.links.push({
      from: { type: "project", key: projectKey },
      to: { type: "communication", key: commKey },
      relation: "owns",
      origin: "folder",
    });

    // correspondent → contact (derived) + link
    if (fromEmail && looksLikePerson(fromName, fromEmail)) {
      const domain = fromEmail.split("@")[1] ?? "";
      const key = resolveContact(plan, {
        name: fromName ?? fromEmail,
        email: fromEmail,
        company: domain && !/gmail|outlook|hotmail|yahoo/.test(domain) ? domain : null,
        isConsultant: false,
        sourceType: "derived",
        sourcePath: "",
        raw: { from: "email.from", firstSeen: note.relPath },
      });
      plan.contacts.get(key)!.sourcePath = key;
      plan.links.push({
        from: { type: "contact", key },
        to: { type: "project", key: projectKey },
        relation: "participates_in",
        origin: "email",
        confidence: 0.6,
      });
      plan.links.push({
        from: { type: "communication", key: commKey },
        to: { type: "contact", key },
        relation: "references",
        origin: "email",
      });
    }

    // action items → tasks
    for (const cb of extractCheckboxes(note.body, "Action Items")) {
      const verdict = classifyActionItem(cb.text);
      if (!verdict.keep) {
        R.tasksSkipped.push({ text: cb.text, reason: verdict.reason, source: note.relPath });
        continue;
      }
      plan.tasks.push({
        title: cb.text,
        status: cb.checked ? "done" : "open",
        priority: str(efm.priority),
        dueDate: str(efm.due),
        projectKey,
        sourceKind: "email_action_item",
        source: { type: "communication", key: commKey },
        sourceType: "vault-markdown",
        sourcePath: note.relPath,
        sourceLine: cb.line,
      });
    }
  }

  // 4. architect → contact + link (merges into an email-derived person if one exists)
  const architect = str(fm.architect);
  if (architect) {
    const key = resolveContact(plan, {
      name: architect,
      role: "Architect",
      isConsultant: false,
      sourceType: "derived",
      sourcePath: "",
      raw: { from: "project.architect", project: number },
    });
    plan.contacts.get(key)!.sourcePath = key;
    plan.links.push({
      from: { type: "project", key: projectKey },
      to: { type: "contact", key },
      relation: "assigned_to",
      origin: "frontmatter",
    });
  }

  // 5. meetings
  const meetingsDir = join(projectFolder, "Meetings");
  for (const abs of existsSync(meetingsDir) ? listMarkdown(meetingsDir) : []) {
    R.filesScanned += 1;
    const note = parseNote(vaultRoot, abs);
    if (str(note.frontmatter.type) !== "meeting") continue;
    const mkey = note.relPath;
    const mfm = note.frontmatter;
    plan.meetings.set(mkey, {
      title: basename(note.relPath).replace(/\.md$/, ""),
      date: str(mfm.date),
      startsAt: toDate(mfm.date),
      agenda: section(note.body, "Agenda") || str(mfm.agenda),
      followUp: section(note.body, "Follow-up") || str(mfm.follow_up),
      sourceType: "vault-markdown",
      sourcePath: note.relPath,
      sourceHash: note.hash,
      raw: mfm,
    });
    bump(R.detected, "meetings");
    plan.meetingExtras.set(mkey, {
      attendees: strArray(mfm.attendees),
      decisions: strArray(mfm.decisions),
    });
    plan.links.push({
      from: { type: "project", key: projectKey },
      to: { type: "meeting", key: mkey },
      relation: "owns",
      origin: "folder",
    });
    for (const cb of extractCheckboxes(note.body, "Action Items")) {
      const verdict = classifyActionItem(cb.text);
      if (!verdict.keep) {
        R.tasksSkipped.push({ text: cb.text, reason: verdict.reason, source: note.relPath });
        continue;
      }
      plan.tasks.push({
        title: cb.text,
        status: cb.checked ? "done" : "open",
        priority: null,
        dueDate: null,
        projectKey,
        sourceKind: "meeting_action_item",
        source: { type: "meeting", key: mkey },
        sourceType: "vault-markdown",
        sourcePath: note.relPath,
        sourceLine: cb.line,
      });
    }
  }

  // 6. documents (files in the project's doc folders)
  for (const folder of DOC_FOLDERS) {
    const dir = join(projectFolder, folder);
    if (!existsSync(dir)) continue;
    for (const f of listFiles(dir)) {
      const ext = f.abs.split(".").pop()?.toLowerCase() ?? "";
      let sha: string;
      try {
        sha = sha256(readFileSync(f.abs));
      } catch (err) {
        R.errors.push(`hash ${f.abs}: ${(err as Error).message}`);
        continue;
      }
      const dkey = sha;
      if (plan.documents.has(dkey)) {
        R.duplicates.push(`duplicate document hash ${sha.slice(0, 12)} (${basename(f.abs)})`);
        continue;
      }
      plan.documents.set(dkey, {
        title: basename(f.abs),
        docType: DOC_TYPE_BY_FOLDER[folder] ?? "other",
        filePath: f.abs,
        sha256: sha,
        sizeBytes: f.size,
        mime: MIME_BY_EXT[ext] ?? null,
        fileModifiedAt: f.mtime,
        sourceType: "vault-file",
        sourcePath: f.abs,
      });
      bump(R.detected, "documents");
      plan.links.push({
        from: { type: "project", key: projectKey },
        to: { type: "document", key: dkey },
        relation: "owns",
        origin: "folder",
      });
    }
  }

  // 7. knowledge notes that reference this project
  const projectBasename = basename(projectFolder);
  const knowledgeAbs = join(vaultRoot, KNOWLEDGE_DIR);
  for (const abs of existsSync(knowledgeAbs) ? listMarkdown(knowledgeAbs) : []) {
    const note = parseNote(vaultRoot, abs);
    const type = str(note.frontmatter.type) ?? "";
    if (!["code", "knowledge", "spec", "standard", "reference"].includes(type)) continue;
    const links = extractWikilinks(note.body).concat(
      strArray(note.frontmatter.projects),
    );
    if (!links.some((l) => l.includes(number) || l.includes(projectBasename))) continue;
    const kkey = note.relPath;
    plan.knowledge.set(kkey, {
      title: str(note.frontmatter.code_name) ?? basename(note.relPath).replace(/\.md$/, ""),
      kind: type === "code" ? "code" : type,
      bodyMarkdown: note.body.trim(),
      codeName: str(note.frontmatter.code_name),
      edition: str(note.frontmatter.edition),
      jurisdiction: str(note.frontmatter.jurisdiction),
      effectiveDate: str(note.frontmatter.effective_date),
      sourceUrl: str(note.frontmatter.source),
      status: str(note.frontmatter.status),
      sourceType: "vault-markdown",
      sourcePath: note.relPath,
      sourceHash: note.hash,
      raw: note.frontmatter,
    });
    bump(R.detected, "knowledge");
    plan.links.push({
      from: { type: "project", key: projectKey },
      to: { type: "knowledge", key: kkey },
      relation: "references",
      origin: "wikilink",
    });
  }

  // 8. consultant notes that list this project
  const consultantsAbs = join(vaultRoot, CONSULTANTS_DIR);
  for (const abs of existsSync(consultantsAbs) ? listMarkdown(consultantsAbs) : []) {
    const note = parseNote(vaultRoot, abs);
    if (str(note.frontmatter.type) !== "consultant") continue;
    const projs = strArray(note.frontmatter.projects).map((p) =>
      p.replace(/^\[\[|\]\]$/g, ""),
    );
    if (!projs.some((p) => p.includes(number) || p.includes(projectBasename))) continue;
    const ckey = resolveContact(plan, {
      name: str(note.frontmatter.contact) ?? basename(note.relPath).replace(/\.md$/, ""),
      company: str(note.frontmatter.company),
      role: str(note.frontmatter.role),
      trade: str(note.frontmatter.trade),
      email: str(note.frontmatter.email),
      phone: str(note.frontmatter.phone),
      cell: str(note.frontmatter.cell),
      website: str(note.frontmatter.website),
      licenseNumber: str(note.frontmatter.license_number),
      fee: str(note.frontmatter.fee),
      isConsultant: true,
      sourceType: "vault-markdown",
      sourcePath: note.relPath,
      sourceHash: note.hash,
      raw: note.frontmatter,
    });
    // consultant note is the authoritative source — override the derived key path
    const c = plan.contacts.get(ckey)!;
    c.sourceType = "vault-markdown";
    c.sourcePath = note.relPath;
    plan.links.push({
      from: { type: "contact", key: ckey },
      to: { type: "project", key: projectKey },
      relation: "assigned_to",
      origin: "frontmatter",
    });
  }

  // navigation wikilinks in the project note are dropped on purpose
  for (const wl of extractWikilinks(projectNote.body)) {
    if (!isNavLink(wl)) {
      R.warnings.push(`project note wikilink not resolved: [[${wl}]]`);
    }
  }

  R.detected.contacts = plan.contacts.size;
  R.detected.tasks = plan.tasks.length;
  R.tasksKept = plan.tasks.length;
  R.relationships = plan.links.length;
  return plan;
}

// --- apply ----------------------------------------------------------

export async function applyPlan(plan: Plan, database: Db): Promise<Report> {
  const R = plan.report;
  const ids = {
    project: new Map<string, string>(),
    contact: new Map<string, string>(),
    communication: new Map<string, string>(),
    meeting: new Map<string, string>(),
    knowledge: new Map<string, string>(),
    document: new Map<string, string>(),
  };
  const now = new Date();

  async function upsert(
    table: any,
    conflictTarget: any[],
    row: Record<string, unknown>,
  ): Promise<string> {
    const values = { ...row, importedAt: now, updatedAt: now };
    const setCols: Record<string, unknown> = {};
    for (const k of Object.keys(values)) {
      if (k === "id" || k === "createdAt") continue;
      setCols[k] = (values as Record<string, unknown>)[k];
    }
    const res = await database
      .insert(table)
      .values(values)
      .onConflictDoUpdate({ target: conflictTarget, set: setCols })
      .returning({ id: table.id });
    return res[0].id as string;
  }

  // projects
  for (const [key, row] of plan.projects) {
    ids.project.set(key, await upsert(t.projects, [t.projects.number], row));
    bump(R.imported, "projects");
  }
  // contacts
  for (const [key, row] of plan.contacts) {
    ids.contact.set(
      key,
      await upsert(t.contacts, [t.contacts.sourceType, t.contacts.sourcePath], row),
    );
    bump(R.imported, "contacts");
  }
  // communications
  for (const [key, row] of plan.communications) {
    const projLink = plan.links.find(
      (l) => l.to.type === "communication" && l.to.key === key && l.from.type === "project",
    );
    const projectId = projLink ? ids.project.get(projLink.from.key) ?? null : null;
    ids.communication.set(
      key,
      await upsert(t.communications, [t.communications.providerId], { ...row, projectId }),
    );
    bump(R.imported, "communications");
  }
  // meetings + extras
  for (const [key, row] of plan.meetings) {
    const projLink = plan.links.find(
      (l) => l.to.type === "meeting" && l.to.key === key && l.from.type === "project",
    );
    const projectId = projLink ? ids.project.get(projLink.from.key) ?? null : null;
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
  // knowledge
  for (const [key, row] of plan.knowledge) {
    ids.knowledge.set(
      key,
      await upsert(t.knowledgeNotes, [t.knowledgeNotes.sourceType, t.knowledgeNotes.sourcePath], row),
    );
    bump(R.imported, "knowledge");
  }
  // documents
  for (const [key, row] of plan.documents) {
    const projLink = plan.links.find(
      (l) => l.to.type === "document" && l.to.key === key && l.from.type === "project",
    );
    const projectId = projLink ? ids.project.get(projLink.from.key) ?? null : null;
    ids.document.set(key, await upsert(t.documents, [t.documents.sha256], { ...row, projectId }));
    bump(R.imported, "documents");
  }
  // tasks
  for (const stage of plan.tasks) {
    const projectId = stage.projectKey ? ids.project.get(stage.projectKey) ?? null : null;
    let sourceEntityId: string | null = null;
    let sourceEntityType: string | null = null;
    if (stage.source) {
      sourceEntityType = stage.source.type;
      const map =
        stage.source.type === "communication"
          ? ids.communication
          : stage.source.type === "meeting"
            ? ids.meeting
            : stage.source.type === "project"
              ? ids.project
              : null;
      sourceEntityId = map?.get(stage.source.key) ?? null;
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
        sourceEntityType,
        sourceEntityId,
        sourceLine: stage.sourceLine,
        sourceType: stage.sourceType,
        sourcePath: stage.sourcePath,
        importedAt: now,
      })
      .onConflictDoUpdate({
        target: [t.tasks.sourceType, t.tasks.sourcePath, t.tasks.sourceLine],
        set: { title: stage.title, status: stage.status, projectId, updatedAt: now },
      });
    bump(R.imported, "tasks");
  }

  // links
  const refId = (ref: Ref): string | null => {
    const m = (ids as Record<string, Map<string, string>>)[ref.type];
    return m?.get(ref.key) ?? null;
  };
  for (const link of plan.links) {
    const fromId = refId(link.from);
    const toId = refId(link.to);
    if (!fromId || !toId) {
      R.warnings.push(
        `link dropped (${link.from.type}:${link.from.key} → ${link.to.type}:${link.to.key})`,
      );
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

  // tags
  for (const name of plan.tags) {
    await database.insert(t.tags).values({ name }).onConflictDoNothing();
  }

  // activity
  const firstProjectId = [...ids.project.values()][0] ?? null;
  if (firstProjectId) {
    await database.insert(t.activity).values({
      actor: "vault-importer",
      actorKind: "system",
      verb: "imported",
      entityType: "project",
      entityId: firstProjectId,
      projectId: firstProjectId,
      summary: `Imported from Vault: ${JSON.stringify(R.imported)}`,
      payload: R.imported,
    });
  }

  return R;
}
