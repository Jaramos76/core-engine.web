// Extraction — turns Vault notes into staged plan entities. Read-only.

import { basename, dirname, join, relative } from "node:path";
import { existsSync, readFileSync } from "node:fs";

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
import { classifyActionItem, emailStatus, isNavLink, looksLikePerson } from "./classify";
import {
  addLink,
  addPendingLink,
  bump,
  indexTitle,
  resolveContact,
} from "./plan";
import type { Plan } from "./types";

const PROJECTS_DIR = "01 Work/Projects";
const CONSULTANTS_DIR = "01 Work/Consultants";
const INBOX_DIR = "01 Work/Email Inbox";
const KNOWLEDGE_DIR = "03 Knowledge";
const IDEAS_DIR = "03 Knowledge/Ideas";

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

const IDEA_MATURITY_BY_FOLDER: Record<string, string> = {
  "00 idea inbox": "captured",
  "01 active ideas": "active",
  "02 researching": "researching",
  "03 challenged": "challenged",
  "04 experiments": "experiment",
  "05 prototypes": "prototype",
  "06 validated": "validated",
  "07 implementation candidates": "candidate",
  "08 implemented": "implemented",
  "09 rejected": "rejected",
  "10 archive": "archived",
};

const IDEA_RELATION_FIELDS = [
  "related",
  "depends_on",
  "enables",
  "supports",
  "conflicts_with",
  "contradicts",
  "supersedes",
  "superseded_by",
  "derived_from",
] as const;

const KNOWLEDGE_TYPES = new Set(["code", "knowledge", "spec", "standard", "reference", "manufacturer"]);
const SKIP_TYPES = new Set([
  "knowledge-source",
  "knowledge-library",
  "idea-system-help",
  "core-engine-system",
  "system-dashboard",
  "system-status",
  "idea-network",
]);

// ---------------------------------------------------------------------------

function emailBody(note: Note): string {
  return section(note.body, "Message") || note.body.trim();
}
function emailSubject(note: Note): string {
  const h = note.body.match(/^#\s+(.+)$/m);
  return h ? h[1].trim() : str(note.frontmatter.subject) ?? basename(note.relPath).replace(/\.md$/, "");
}
function cleanWikilink(s: string): string {
  return s.replace(/^\[\[|\]\]$/g, "").replace(/\|.*$/, "").trim();
}

/** Find the project key for a name/number/path reference. */
function resolveProjectRef(plan: Plan, ref: string | null): string | null {
  if (!ref) return null;
  const r = cleanWikilink(ref).toLowerCase();
  for (const [key, row] of plan.projects) {
    const num = String(row.number).toLowerCase();
    const name = String(row.name).toLowerCase();
    const path = String((row.sourcePath as string) ?? "").toLowerCase();
    if (r === key.toLowerCase() || r.includes(num) || r.includes(name) || path.includes(r)) {
      return key;
    }
  }
  return null;
}

// --- action items -> tasks (shared by emails and meetings) ---------------

function normTaskTitle(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim().slice(0, 80);
}

function collectActionTasks(
  plan: Plan,
  note: Note,
  ctx: {
    projectKey: string | null;
    source: { type: string; key: string };
    sourceKind: string;
    priority: string | null;
    dueDate: string | null;
  },
) {
  for (const cb of extractCheckboxes(note.body, "Action Items")) {
    const v = classifyActionItem(cb.text);
    if (v.disposition === "skip") {
      plan.report.tasksSkipped.push({ text: cb.text, reason: v.reason, source: note.relPath });
      continue;
    }
    // Quoted email chains repeat the same action items — keep the first.
    const dk = `${ctx.projectKey ?? "-"}::${normTaskTitle(cb.text)}`;
    if (plan.taskKeys.has(dk)) {
      plan.report.duplicates.push(`repeated task "${cb.text.slice(0, 50)}" (${note.relPath})`);
      continue;
    }
    plan.taskKeys.add(dk);
    plan.tasks.push({
      title: cb.text,
      status: cb.checked ? "done" : "open",
      priority: ctx.priority,
      dueDate: ctx.dueDate,
      projectKey: ctx.projectKey,
      sourceKind: ctx.sourceKind,
      source: ctx.source,
      sourceType: "vault-markdown",
      sourcePath: note.relPath,
      sourceLine: cb.line,
      extractionConfidence: v.confidence,
      reviewRequired: v.disposition === "review",
    });
    if (v.disposition === "review") plan.report.reviewRequiredTasks += 1;
  }
}

// --- one project (folder + main note) -----------------------------------

export function importProject(plan: Plan, vaultRoot: string, projectNoteAbs: string) {
  const R = plan.report;
  const note = parseNote(vaultRoot, projectNoteAbs);
  R.filesScanned += 1;
  const folder = dirname(projectNoteAbs);
  const fm = note.frontmatter;
  const fmNum = str(fm.project_number);
  const folderNum = basename(folder).match(/^(\d{2}-\d{2}(?:-\d+)?)/)?.[1] ?? null;
  // "XX-XX" is the unfilled template placeholder — prefer the folder.
  const number =
    fmNum && !/^x+-x+$/i.test(fmNum) ? fmNum : folderNum ?? fmNum ?? basename(folder);
  const projectKey = number;

  plan.projects.set(projectKey, {
    number,
    name: str(fm.project_name) ?? basename(folder),
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
    sourcePath: note.relPath,
    sourceHash: note.hash,
    raw: fm,
  });
  bump(R.detected, "projects");
  indexTitle(plan, basename(folder), { type: "project", key: projectKey });
  indexTitle(plan, `${number} - ${str(fm.project_name) ?? ""}`, { type: "project", key: projectKey });
  for (const tag of strArray(fm.tags)) plan.tags.add(tag);

  // next action -> task (user-authored: full confidence, no review)
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
      sourcePath: note.relPath,
      sourceLine: 0,
      extractionConfidence: null,
      reviewRequired: false,
    });
  }

  // emails
  const emailsDir = join(folder, "Emails");
  for (const abs of existsSync(emailsDir) ? listMarkdown(emailsDir) : []) {
    importEmail(plan, vaultRoot, abs, { projectKey, inArchiveFolder: false });
  }

  // architect -> contact
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
    addLink(plan, {
      from: { type: "project", key: projectKey },
      to: { type: "contact", key },
      relation: "assigned_to",
      origin: "frontmatter",
    });
  }

  // meetings
  const meetingsDir = join(folder, "Meetings");
  for (const abs of existsSync(meetingsDir) ? listMarkdown(meetingsDir) : []) {
    const mnote = parseNote(vaultRoot, abs);
    if (str(mnote.frontmatter.type) !== "meeting") continue;
    R.filesScanned += 1;
    const mkey = mnote.relPath;
    const mfm = mnote.frontmatter;
    plan.meetings.set(mkey, {
      title: basename(mnote.relPath).replace(/\.md$/, ""),
      date: str(mfm.date),
      startsAt: toDate(mfm.date),
      agenda: section(mnote.body, "Agenda") || str(mfm.agenda),
      followUp: section(mnote.body, "Follow-up") || str(mfm.follow_up),
      sourceType: "vault-markdown",
      sourcePath: mnote.relPath,
      sourceHash: mnote.hash,
      raw: mfm,
    });
    bump(R.detected, "meetings");
    plan.meetingExtras.set(mkey, {
      attendees: strArray(mfm.attendees).map(cleanWikilink),
      decisions: strArray(mfm.decisions),
    });
    addLink(plan, {
      from: { type: "project", key: projectKey },
      to: { type: "meeting", key: mkey },
      relation: "owns",
      origin: "folder",
    });
    collectActionTasks(plan, mnote, {
      projectKey,
      source: { type: "meeting", key: mkey },
      sourceKind: "meeting_action_item",
      priority: null,
      dueDate: null,
    });
  }

  // documents on disk
  for (const folderName of DOC_FOLDERS) {
    const dir = join(folder, folderName);
    if (!existsSync(dir)) continue;
    for (const f of listFiles(dir)) {
      const ext = f.abs.split(".").pop()?.toLowerCase() ?? "";
      let hash: string;
      try {
        hash = sha256(readFileSync(f.abs));
      } catch (err) {
        R.errors.push(`hash ${f.abs}: ${(err as Error).message}`);
        continue;
      }
      if (plan.documents.has(hash)) {
        R.duplicates.push(`duplicate document ${hash.slice(0, 12)} (${basename(f.abs)})`);
        continue;
      }
      plan.documents.set(hash, {
        title: basename(f.abs),
        docType: DOC_TYPE_BY_FOLDER[folderName] ?? "other",
        filePath: f.abs,
        sha256: hash,
        sizeBytes: f.size,
        mime: MIME_BY_EXT[ext] ?? null,
        fileModifiedAt: f.mtime,
        sourceType: "vault-file",
        sourcePath: relative(vaultRoot, f.abs),
      });
      bump(R.detected, "documents");
      addLink(plan, {
        from: { type: "project", key: projectKey },
        to: { type: "document", key: hash },
        relation: "owns",
        origin: "folder",
      });
    }
  }

  for (const wl of extractWikilinks(note.body)) {
    if (!isNavLink(wl)) {
      addPendingLink(plan, {
        from: { type: "project", key: projectKey },
        toTitle: wl,
        relation: "related_to",
        origin: "wikilink",
      });
    }
  }
}

// --- one email (project-filed or inbox) -------------------------------

function importEmail(
  plan: Plan,
  vaultRoot: string,
  abs: string,
  opts: { projectKey: string | null; inArchiveFolder: boolean },
) {
  const R = plan.report;
  let note: Note;
  try {
    note = parseNote(vaultRoot, abs);
  } catch (err) {
    R.errors.push(`parse ${abs}: ${(err as Error).message}`);
    return;
  }
  R.filesScanned += 1;
  const efm = note.frontmatter;
  if (str(efm.type) !== "email") {
    R.warnings.push(`${note.relPath}: expected type email — skipped`);
    return;
  }

  const providerId = str(efm.provider_id);
  const commKey = providerId ?? `path:${note.relPath}`;
  if (plan.communications.has(commKey)) {
    R.duplicates.push(`duplicate email ${providerId ?? note.relPath}`);
    return;
  }

  // resolve project: caller hint (folder), else frontmatter
  let projectKey =
    opts.projectKey ??
    resolveProjectRef(plan, str(efm.project_path) ?? str(efm.project));
  if (!projectKey && (str(efm.project) || str(efm.project_path))) {
    R.unresolvedProjectAssociations.push(
      `${note.relPath} → "${str(efm.project) ?? str(efm.project_path)}"`,
    );
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
    status: emailStatus(str(efm.status), opts.inArchiveFolder),
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

  if (projectKey) {
    addLink(plan, {
      from: { type: "project", key: projectKey },
      to: { type: "communication", key: commKey },
      relation: "owns",
      origin: opts.projectKey ? "folder" : "frontmatter",
    });
  }

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
    if (projectKey) {
      addLink(plan, {
        from: { type: "contact", key },
        to: { type: "project", key: projectKey },
        relation: "participates_in",
        origin: "email",
        confidence: 0.6,
      });
    }
    addLink(plan, {
      from: { type: "communication", key: commKey },
      to: { type: "contact", key },
      relation: "references",
      origin: "email",
    });
  }

  collectActionTasks(plan, note, {
    projectKey,
    source: { type: "communication", key: commKey },
    sourceKind: "email_action_item",
    priority: str(efm.priority),
    dueDate: str(efm.due),
  });
}

// --- standalone collectors (run once for the whole Vault) -------------

export function importInboxEmails(plan: Plan, vaultRoot: string) {
  const dir = join(vaultRoot, INBOX_DIR);
  if (!existsSync(dir)) return;
  for (const abs of listMarkdown(dir)) {
    const inArchive = /\/Archive\//.test(abs) || /\/Archive$/.test(dirname(abs));
    importEmail(plan, vaultRoot, abs, { projectKey: null, inArchiveFolder: inArchive });
  }
}

export function importConsultants(
  plan: Plan,
  vaultRoot: string,
  opts?: { scopeKeys?: Set<string> },
) {
  const dir = join(vaultRoot, CONSULTANTS_DIR);
  if (!existsSync(dir)) return;
  const R = plan.report;
  for (const abs of listMarkdown(dir)) {
    const note = parseNote(vaultRoot, abs);
    if (str(note.frontmatter.type) !== "consultant") continue;
    const fm = note.frontmatter;

    // In targeted (--project) mode, only pull consultants tied to that project.
    if (opts?.scopeKeys) {
      const refs = strArray(fm.projects)
        .map((r) => resolveProjectRef(plan, r))
        .filter((k): k is string => k != null && opts.scopeKeys!.has(k));
      if (refs.length === 0) continue;
    }
    R.filesScanned += 1;
    const key = resolveContact(plan, {
      name: str(fm.contact) ?? basename(note.relPath).replace(/\.md$/, ""),
      company: str(fm.company),
      role: str(fm.role),
      trade: str(fm.trade),
      email: str(fm.email),
      phone: str(fm.phone),
      cell: str(fm.cell),
      website: str(fm.website),
      licenseNumber: str(fm.license_number),
      fee: str(fm.fee),
      isConsultant: true,
      sourceType: "vault-markdown",
      sourcePath: note.relPath,
      sourceHash: note.hash,
      raw: fm,
    });
    const c = plan.contacts.get(key)!;
    c.sourceType = "vault-markdown";
    c.sourcePath = note.relPath;
    bump(R.detected, "contacts_from_notes");

    for (const projRef of strArray(fm.projects)) {
      const pk = resolveProjectRef(plan, projRef);
      if (pk) {
        addLink(plan, {
          from: { type: "contact", key },
          to: { type: "project", key: pk },
          relation: "assigned_to",
          origin: "frontmatter",
        });
      } else if (!opts?.scopeKeys) {
        R.unresolvedProjectAssociations.push(
          `consultant ${basename(abs)} → "${cleanWikilink(projRef)}"`,
        );
      }
    }
  }
}

export function importKnowledge(plan: Plan, vaultRoot: string) {
  const dir = join(vaultRoot, KNOWLEDGE_DIR);
  if (!existsSync(dir)) return;
  const R = plan.report;
  for (const abs of listMarkdown(dir)) {
    if (abs.startsWith(join(vaultRoot, IDEAS_DIR))) continue; // ideas handled separately
    const note = parseNote(vaultRoot, abs);
    const type = str(note.frontmatter.type) ?? "";
    if (SKIP_TYPES.has(type)) continue;
    if (!KNOWLEDGE_TYPES.has(type)) continue;
    R.filesScanned += 1;
    const fm = note.frontmatter;
    const kkey = note.relPath;
    const title = str(fm.code_name) ?? str(fm.title) ?? basename(note.relPath).replace(/\.md$/, "");
    plan.knowledge.set(kkey, {
      title,
      kind: type === "code" ? "code" : type,
      bodyMarkdown: note.body.trim(),
      codeName: str(fm.code_name),
      edition: str(fm.edition),
      jurisdiction: str(fm.jurisdiction),
      effectiveDate: str(fm.effective_date),
      sourceUrl: str(fm.source),
      status: str(fm.status),
      sourceType: "vault-markdown",
      sourcePath: note.relPath,
      sourceHash: note.hash,
      raw: fm,
    });
    bump(R.detected, "knowledge");
    indexTitle(plan, title, { type: "knowledge", key: kkey });
    indexTitle(plan, basename(note.relPath), { type: "knowledge", key: kkey });
    for (const tag of strArray(fm.tags)) plan.tags.add(tag);

    for (const wl of extractWikilinks(note.body).concat(strArray(fm.projects))) {
      if (isNavLink(wl)) continue;
      const pk = resolveProjectRef(plan, wl);
      if (pk) {
        addLink(plan, {
          from: { type: "project", key: pk },
          to: { type: "knowledge", key: kkey },
          relation: "references",
          origin: "wikilink",
        });
      } else {
        addPendingLink(plan, {
          from: { type: "knowledge", key: kkey },
          toTitle: cleanWikilink(wl),
          relation: "related_to",
          origin: "wikilink",
        });
      }
    }
  }
}

export function importIdeas(plan: Plan, vaultRoot: string) {
  const dir = join(vaultRoot, IDEAS_DIR);
  if (!existsSync(dir)) return;
  const R = plan.report;
  for (const abs of listMarkdown(dir)) {
    const note = parseNote(vaultRoot, abs);
    const type = str(note.frontmatter.type) ?? "";
    if (SKIP_TYPES.has(type)) continue;
    if (type !== "idea") continue;
    R.filesScanned += 1;
    const fm = note.frontmatter;
    const ikey = note.relPath;
    const title = basename(note.relPath).replace(/\.md$/, "");
    const folderName = basename(dirname(abs)).toLowerCase();
    plan.ideas.set(ikey, {
      ideaKey: str(fm.idea_id),
      title,
      bodyMarkdown: note.body.trim(),
      status: str(fm.status),
      maturity: str(fm.maturity) ?? IDEA_MATURITY_BY_FOLDER[folderName] ?? null,
      priority: str(fm.priority),
      confidence: str(fm.confidence),
      domain: strArray(fm.domain),
      sourceReference: str(fm.source_reference),
      sourceType: "vault-markdown",
      sourcePath: note.relPath,
      sourceHash: note.hash,
      raw: fm,
    });
    bump(R.detected, "ideas");
    indexTitle(plan, title, { type: "idea", key: ikey });
    for (const tag of strArray(fm.tags)) plan.tags.add(tag);

    for (const field of IDEA_RELATION_FIELDS) {
      for (const ref of strArray(fm[field])) {
        addPendingLink(plan, {
          from: { type: "idea", key: ikey },
          toTitle: cleanWikilink(ref),
          relation: field,
          origin: "frontmatter",
        });
      }
    }
    for (const projRef of strArray(fm.projects)) {
      const pk = resolveProjectRef(plan, projRef);
      if (pk) {
        addLink(plan, {
          from: { type: "idea", key: ikey },
          to: { type: "project", key: pk },
          relation: "about",
          origin: "frontmatter",
        });
      }
    }
    const parent = str(fm.parent_idea);
    if (parent) {
      addPendingLink(plan, {
        from: { type: "idea", key: ikey },
        toTitle: cleanWikilink(parent),
        relation: "derived_from",
        origin: "frontmatter",
      });
    }
  }
}

export function importDocumentCatalogs(plan: Plan, vaultRoot: string) {
  const R = plan.report;
  const catalogsDir = join(vaultRoot, "03 Knowledge/.core-engine/catalogs");
  if (!existsSync(catalogsDir)) return;
  for (const f of listFiles(catalogsDir)) {
    if (!f.abs.endsWith(".tsv")) continue;
    R.filesScanned += 1;
    let rows: string[];
    try {
      rows = readFileSync(f.abs, "utf8").split("\n").filter(Boolean);
    } catch (err) {
      R.errors.push(`read ${f.abs}: ${(err as Error).message}`);
      continue;
    }
    const header = rows.shift()?.split("\t") ?? [];
    const col = (name: string) => header.indexOf(name);
    for (const line of rows) {
      const cells = line.split("\t");
      const sha = cells[col("sha256")];
      if (!sha || plan.documents.has(sha)) {
        if (sha) R.duplicates.push(`catalog document already staged ${sha.slice(0, 12)}`);
        continue;
      }
      const rel = cells[col("relative_path")] ?? "";
      plan.documents.set(sha, {
        title: basename(rel),
        docType: "contract",
        filePath: null,
        sha256: sha,
        sizeBytes: Number(cells[col("bytes")]) || null,
        mime: MIME_BY_EXT[(cells[col("extension")] ?? "").toLowerCase()] ?? null,
        sourceType: "vault-tsv",
        sourcePath: `${relative(vaultRoot, f.abs)}#${rel}`,
      });
      bump(R.detected, "documents");
    }
  }
}
