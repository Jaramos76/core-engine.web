// Core Engine application schema (PostgreSQL, Drizzle).
//
// One row per real entity from the Obsidian Vault. Relationships are
// first-class rows in `links`. Every entity keeps provenance (`sourceType` +
// `sourcePath` + `sourceHash`) so re-importing updates rather than duplicates,
// and the Vault stays authoritative until we formally cut over.
//
// Enum-ish columns are plain text on purpose — Vault data is messy and
// evolving; validation lives in the app layer, not the database.

import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const provenance = {
  sourceType: text("source_type"), // vault-markdown | vault-tsv | manual | agent
  sourcePath: text("source_path"),
  sourceHash: text("source_hash"),
  raw: jsonb("raw"), // verbatim frontmatter / row, for safety
  importedAt: timestamp("imported_at", { withTimezone: true }),
};

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
};

// --- projects --------------------------------------------------------------

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    number: text("number").notNull(), // "25-14"
    name: text("name").notNull(),
    status: text("status"), // active | on-hold | permitting | construction | closeout
    currentPhase: text("current_phase"),
    priority: text("priority"),
    health: text("health"), // green | yellow | red
    projectType: text("project_type"),
    scopeOfWork: text("scope_of_work"),
    addressLine: text("address_line"),
    city: text("city"),
    state: text("state"),
    zip: text("zip"),
    client: text("client"),
    architect: text("architect"),
    projectManager: text("project_manager"),
    ahj: text("ahj"),
    permitNumber: text("permit_number"),
    permitStatus: text("permit_status"),
    sewerAvailable: text("sewer_available"),
    septicSystem: text("septic_system"),
    disciplines: jsonb("disciplines").$type<string[]>().default([]),
    startDate: text("start_date"),
    targetDate: text("target_date"),
    nextAction: text("next_action"),
    nextActionDue: text("next_action_due"),
    lastUpdate: text("last_update"),
    ...provenance,
    ...timestamps,
  },
  (t) => [uniqueIndex("projects_number_key").on(t.number)],
);

// --- contacts (consultants, clients, collaborators) ----------------------

export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    company: text("company"),
    role: text("role"),
    trade: text("trade"), // Structural | MEP | Civil | ...
    discipline: text("discipline"),
    email: text("email"),
    phone: text("phone"),
    cell: text("cell"),
    office: text("office"),
    website: text("website"),
    licenseNumber: text("license_number"),
    licenseState: text("license_state"),
    licenseExpiration: text("license_expiration"),
    insurance: text("insurance"),
    insuranceExpiration: text("insurance_expiration"),
    preferredContact: text("preferred_contact"),
    fee: text("fee"),
    lastContact: text("last_contact"),
    isConsultant: boolean("is_consultant").default(false).notNull(),
    notes: text("notes"),
    ...provenance,
    ...timestamps,
  },
  (t) => [
    index("contacts_email_idx").on(t.email),
    uniqueIndex("contacts_source_key").on(t.sourceType, t.sourcePath),
  ],
);

// --- communications (emails / messages) ---------------------------------

export const communications = pgTable(
  "communications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    providerId: text("provider_id"), // "outlook:<entryid>" — canonical external id
    messageId: text("message_id"),
    channel: text("channel").default("email").notNull(),
    direction: text("direction"), // inbound | outbound
    subject: text("subject"),
    fromName: text("from_name"),
    fromEmail: text("from_email"),
    toAddrs: text("to_addrs"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    receivedAt: timestamp("received_at", { withTimezone: true }),
    category: text("category"),
    priority: text("priority"),
    actionRequired: boolean("action_required").default(false).notNull(),
    status: text("status"), // inbox | archived
    bodyText: text("body_text"),
    triage: jsonb("triage"),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    projectConfidence: doublePrecision("project_confidence"),
    ...provenance,
    ...timestamps,
  },
  (t) => [
    uniqueIndex("communications_provider_key").on(t.providerId),
    index("communications_project_idx").on(t.projectId),
  ],
);

// --- tasks -------------------------------------------------------------

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status").default("open").notNull(), // open | in-progress | blocked | done
    priority: text("priority"),
    dueDate: text("due_date"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    // where this task came from
    sourceKind: text("source_kind"), // email_action_item | project_next_action | meeting_action_item | manual
    sourceEntityType: text("source_entity_type"),
    sourceEntityId: uuid("source_entity_id"),
    sourceLine: integer("source_line"),
    // deterministic extraction confidence + human review workflow
    extractionConfidence: doublePrecision("extraction_confidence"), // 0..1; null for user-authored tasks
    reviewRequired: boolean("review_required").default(false).notNull(),
    reviewStatus: text("review_status"), // null (n/a) | pending | approved | edited | dismissed
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    ...provenance,
    ...timestamps,
  },
  (t) => [
    index("tasks_project_idx").on(t.projectId),
    index("tasks_status_idx").on(t.status),
    index("tasks_review_idx").on(t.reviewRequired, t.reviewStatus),
    uniqueIndex("tasks_source_key").on(t.sourceType, t.sourcePath, t.sourceLine),
  ],
);

// --- meetings --------------------------------------------------------

export const meetings = pgTable(
  "meetings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    date: text("date"),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    agenda: text("agenda"),
    followUp: text("follow_up"),
    ...provenance,
    ...timestamps,
  },
  (t) => [
    index("meetings_project_idx").on(t.projectId),
    uniqueIndex("meetings_source_key").on(t.sourceType, t.sourcePath),
  ],
);

export const meetingAttendees = pgTable("meeting_attendees", {
  id: uuid("id").defaultRandom().primaryKey(),
  meetingId: uuid("meeting_id")
    .references(() => meetings.id, { onDelete: "cascade" })
    .notNull(),
  contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
  name: text("name"), // free text when no contact match
});

export const decisions = pgTable("decisions", {
  id: uuid("id").defaultRandom().primaryKey(),
  text: text("text").notNull(),
  meetingId: uuid("meeting_id").references(() => meetings.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
  decidedOn: text("decided_on"),
  ...timestamps,
});

// --- knowledge -------------------------------------------------------

export const knowledgeNotes = pgTable(
  "knowledge_notes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    kind: text("kind"), // code | spec | standard | reference | manufacturer | contract | note
    bodyMarkdown: text("body_markdown"),
    codeName: text("code_name"),
    edition: text("edition"),
    jurisdiction: text("jurisdiction"),
    effectiveDate: text("effective_date"),
    sourceUrl: text("source_url"),
    status: text("status"),
    ...provenance,
    ...timestamps,
  },
  (t) => [uniqueIndex("knowledge_source_key").on(t.sourceType, t.sourcePath)],
);

// --- ideas ----------------------------------------------------------

export const ideas = pgTable(
  "ideas",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ideaKey: text("idea_key"), // "IDEA-KNOWLEDGE-VALIDATION-001"
    title: text("title").notNull(),
    bodyMarkdown: text("body_markdown"),
    status: text("status"),
    maturity: text("maturity"), // captured | active | researching | ... | implemented | rejected
    priority: text("priority"),
    confidence: text("confidence"),
    domain: jsonb("domain").$type<string[]>().default([]),
    sourceReference: text("source_reference"),
    ...provenance,
    ...timestamps,
  },
  (t) => [uniqueIndex("ideas_source_key").on(t.sourceType, t.sourcePath)],
);

// --- documents (files on disk — never served raw) --------------------

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    docType: text("doc_type"), // drawing | permit | submittal | rfi | report | contract | photo | other
    revision: text("revision"),
    status: text("status"),
    filePath: text("file_path"), // absolute path on the operator's machine
    sha256: text("sha256"),
    sizeBytes: integer("size_bytes"),
    mime: text("mime"),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    fileModifiedAt: timestamp("file_modified_at", { withTimezone: true }),
    ...provenance,
    ...timestamps,
  },
  (t) => [
    index("documents_project_idx").on(t.projectId),
    uniqueIndex("documents_sha_key").on(t.sha256),
  ],
);

// --- activity feed --------------------------------------------------

export const activity = pgTable(
  "activity",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actor: text("actor"), // person name or agent id
    actorKind: text("actor_kind").default("system"), // person | agent | system
    verb: text("verb").notNull(), // imported | created | updated | replied | ...
    entityType: text("entity_type"),
    entityId: uuid("entity_id"),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    summary: text("summary"),
    payload: jsonb("payload"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("activity_project_idx").on(t.projectId),
    index("activity_occurred_idx").on(t.occurredAt),
  ],
);

// --- tags ---------------------------------------------------------

export const tags = pgTable(
  "tags",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
  },
  (t) => [uniqueIndex("tags_name_key").on(t.name)],
);

export const entityTags = pgTable(
  "entity_tags",
  {
    tagId: uuid("tag_id")
      .references(() => tags.id, { onDelete: "cascade" })
      .notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
  },
  (t) => [
    uniqueIndex("entity_tags_key").on(t.tagId, t.entityType, t.entityId),
    index("entity_tags_entity_idx").on(t.entityType, t.entityId),
  ],
);

// --- links (the generic relationship table) ---------------------

export const links = pgTable(
  "links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fromType: text("from_type").notNull(),
    fromId: uuid("from_id").notNull(),
    toType: text("to_type").notNull(),
    toId: uuid("to_id").notNull(),
    relation: text("relation").notNull(), // owns | assigned_to | depends_on | about | references | participates_in | generated_by | blocks | related_to
    origin: text("origin"), // folder | frontmatter | wikilink | inferred
    confidence: doublePrecision("confidence").default(1),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("links_key").on(t.fromType, t.fromId, t.toType, t.toId, t.relation),
    index("links_from_idx").on(t.fromType, t.fromId),
    index("links_to_idx").on(t.toType, t.toId),
  ],
);

// --- import runs (one row per importer invocation) -------------

export const importRuns = pgTable("import_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  mode: text("mode").notNull(), // dry-run | apply
  scope: text("scope"), // "project:25-14" | "full"
  vaultPath: text("vault_path"),
  report: jsonb("report"),
  ok: boolean("ok"),
});
