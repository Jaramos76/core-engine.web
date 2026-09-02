// Core Engine OS — demonstration dataset.
//
// ISOLATED mock data. Nothing else in the app hard-codes entity values; when
// Core Engine APIs come online, replace `buildMockDataset()` with a loader that
// returns the same `Dataset` shape. UI components read only from the dataset
// provided by `OSProvider`.

import type {
  AgentState,
  Dataset,
  Entity,
  Relationship,
  RelationshipType,
} from "../types";

export const NOW_ISO = "2026-09-02T09:00:00.000Z";

function day(offset: number, hour = 9): string {
  const base = new Date(NOW_ISO);
  base.setUTCDate(base.getUTCDate() + offset);
  base.setUTCHours(hour, 0, 0, 0);
  return base.toISOString();
}

let relSeq = 0;
function rel(
  source: string,
  target: string,
  type: RelationshipType,
  weight = 0.5,
): Relationship {
  relSeq += 1;
  return { id: `r${relSeq}`, source, target, type, weight };
}

export function buildMockDataset(): Dataset {
  relSeq = 0;
  const entities: Entity[] = [];
  const relationships: Relationship[] = [];
  const add = (e: Entity) => {
    entities.push(e);
    return e.id;
  };

  // --- agents ----------------------------------------------------------
  add({
    id: "agent-lola",
    category: "agent",
    name: "Lola",
    role: "Orchestrator",
    state: "thinking",
    activity: "Reconciling the day's priorities across 5 projects",
    orchestrator: true,
    summary:
      "Primary orchestrator. Routes intent to specialist agents and keeps the active context coherent.",
  });
  const specialists: {
    id: string;
    name: string;
    role: string;
    state: AgentState;
    activity: string;
  }[] = [
    { id: "agent-project", name: "Project Agent", role: "Project operations", state: "executing", activity: "Updating Del Campo task board from permit comments" },
    { id: "agent-schedule", name: "Schedule Agent", role: "Time & sequencing", state: "waiting", activity: "Holding for structural consultant availability" },
    { id: "agent-research", name: "Research Agent", role: "Investigation", state: "researching", activity: "Precedent search: hillside retaining strategies" },
    { id: "agent-code", name: "Building Code Agent", role: "Code compliance", state: "attention", activity: "Egress width conflict flagged on Level 2" },
    { id: "agent-zoning", name: "Zoning Agent", role: "Land use", state: "idle", activity: "Idle" },
    { id: "agent-contract", name: "Contract Agent", role: "Agreements", state: "blocked", activity: "Awaiting countersignature from client" },
    { id: "agent-comm", name: "Communication Agent", role: "Correspondence", state: "executing", activity: "Drafting reply to permit reviewer" },
    { id: "agent-task", name: "Task Agent", role: "Task capture", state: "idle", activity: "Idle" },
    { id: "agent-knowledge", name: "Knowledge Agent", role: "Knowledge base", state: "thinking", activity: "Indexing 3 new reports" },
    { id: "agent-document", name: "Document Agent", role: "Documents & sets", state: "idle", activity: "Idle" },
    { id: "agent-finance", name: "Finance Agent", role: "Budget & pay apps", state: "attention", activity: "Pay application 4 is 6 days overdue" },
  ];
  specialists.forEach((s) => {
    add({
      id: s.id,
      category: "agent",
      name: s.name,
      role: s.role,
      state: s.state,
      activity: s.activity,
      summary: `${s.role} specialist agent.`,
    });
    relationships.push(rel("agent-lola", s.id, "related-to", 0.8));
  });

  // --- tools ----------------------------------------------------------
  const tools: { id: string; name: string; kind: string }[] = [
    { id: "tool-municode", name: "Municode Index", kind: "integration" },
    { id: "tool-permit-portal", name: "Permit Portal", kind: "integration" },
    { id: "tool-cad", name: "CAD / DXF Reader", kind: "skill" },
    { id: "tool-cost", name: "Cost Estimator", kind: "skill" },
    { id: "tool-gmail", name: "Mail Connector", kind: "integration" },
    { id: "tool-calendar", name: "Calendar Connector", kind: "integration" },
    { id: "tool-search", name: "Web Research", kind: "api" },
    { id: "tool-vault", name: "Knowledge Vault", kind: "compute" },
  ];
  tools.forEach((t) =>
    add({ id: t.id, category: "tool", name: t.name, kind: t.kind as "api" | "skill" | "integration" | "compute" }),
  );
  relationships.push(
    rel("agent-code", "tool-municode", "uses", 0.9),
    rel("agent-code", "tool-cad", "uses", 0.7),
    rel("agent-zoning", "tool-municode", "uses", 0.8),
    rel("agent-research", "tool-search", "uses", 0.9),
    rel("agent-research", "tool-vault", "uses", 0.6),
    rel("agent-comm", "tool-gmail", "uses", 0.9),
    rel("agent-schedule", "tool-calendar", "uses", 0.9),
    rel("agent-finance", "tool-cost", "uses", 0.8),
    rel("agent-document", "tool-cad", "uses", 0.7),
    rel("agent-project", "tool-permit-portal", "uses", 0.8),
    rel("agent-knowledge", "tool-vault", "uses", 0.9),
  );

  // --- knowledge ----------------------------------------------------
  const knowledge: { id: string; name: string; domain: string }[] = [
    { id: "know-egress", name: "IBC Egress Requirements", domain: "building-code" },
    { id: "know-hillside", name: "Hillside Grading Ordinance", domain: "zoning" },
    { id: "know-retaining", name: "Retaining Wall Detailing", domain: "construction" },
    { id: "know-setbacks", name: "R-1 Setback Standards", domain: "zoning" },
    { id: "know-title24", name: "Energy Code (Title 24)", domain: "building-code" },
    { id: "know-shotcrete", name: "Shotcrete Practice Notes", domain: "materials" },
    { id: "know-rfi-process", name: "RFI Handling Process", domain: "process" },
    { id: "know-precedent-hill", name: "Precedent: Cantilevered Hillside Homes", domain: "precedent" },
  ];
  knowledge.forEach((k) =>
    add({ id: k.id, category: "knowledge", name: k.name, domain: k.domain as "building-code" | "zoning" | "construction" | "materials" | "process" | "precedent" }),
  );
  relationships.push(
    rel("agent-code", "know-egress", "uses", 0.9),
    rel("agent-code", "know-title24", "uses", 0.6),
    rel("agent-zoning", "know-setbacks", "uses", 0.8),
    rel("agent-zoning", "know-hillside", "uses", 0.9),
    rel("agent-research", "know-precedent-hill", "uses", 0.8),
    rel("agent-knowledge", "know-rfi-process", "uses", 0.7),
    rel("know-retaining", "know-shotcrete", "related-to", 0.6),
    rel("know-hillside", "know-retaining", "related-to", 0.5),
  );

  // --- people (consultants + client) ------------------------------
  const people: { id: string; name: string; role: string; org: string; discipline?: string }[] = [
    { id: "person-client-delcampo", name: "Rosa del Campo", role: "Client", org: "Del Campo Family" },
    { id: "person-struct", name: "Elena Marworks", role: "Structural Engineer", org: "Marworks Structural", discipline: "structural" },
    { id: "person-mep", name: "Devon Pryce", role: "MEP Engineer", org: "Pryce Engineering", discipline: "mep" },
    { id: "person-civil", name: "Aya Nakamura", role: "Civil Engineer", org: "Ridgeline Civil", discipline: "civil" },
    { id: "person-geotech", name: "Sam Ortiz", role: "Geotechnical", org: "Ortiz Geo", discipline: "geotech" },
    { id: "person-reviewer", name: "City Plan Reviewer", role: "Permit Reviewer", org: "City of Alameda" },
    { id: "person-gc", name: "Marcus Iyer", role: "General Contractor", org: "Iyer Build" },
    { id: "person-la", name: "Priya Shah", role: "Landscape Architect", org: "Shah Land", discipline: "landscape" },
  ];
  people.forEach((p) =>
    add({ id: p.id, category: "person", name: p.name, role: p.role, org: p.org, discipline: p.discipline }),
  );

  // --- projects ----------------------------------------------------
  const projects: {
    id: string;
    name: string;
    status: string;
    phase: string;
    health: string;
    nextDeadline?: string;
    client?: string;
    location?: string;
  }[] = [
    { id: "proj-delcampo", name: "Del Campo Residence", status: "permitting", phase: "Permit revisions", health: "at-risk", nextDeadline: day(6), client: "Rosa del Campo", location: "Alameda, CA" },
    { id: "proj-marisol", name: "Marisol Tower", status: "active", phase: "Design development", health: "on-track", nextDeadline: day(21), client: "Marisol Group", location: "Oakland, CA" },
    { id: "proj-kestrel", name: "Kestrel Civic Center", status: "active", phase: "Schematic design", health: "on-track", nextDeadline: day(34), client: "City of Kestrel", location: "Kestrel, CA" },
    { id: "proj-atelier", name: "Atelier Nine", status: "construction", phase: "Construction admin", health: "at-risk", nextDeadline: day(3), client: "Nine Studio", location: "Berkeley, CA" },
    { id: "proj-sunset", name: "Sunset Ridge Duplex", status: "on-hold", phase: "Awaiting client", health: "blocked", nextDeadline: day(-4), client: "Ridge Partners", location: "El Cerrito, CA" },
  ];
  projects.forEach((p) =>
    add({
      id: p.id,
      category: "project",
      name: p.name,
      status: p.status as "active" | "on-hold" | "permitting" | "construction" | "closeout",
      phase: p.phase,
      health: p.health as "on-track" | "at-risk" | "blocked",
      nextDeadline: p.nextDeadline,
      client: p.client,
      location: p.location,
    }),
  );

  // Consultants engaged on Del Campo.
  relationships.push(
    rel("proj-delcampo", "person-client-delcampo", "related-to", 0.9),
    rel("proj-delcampo", "person-struct", "depends-on", 0.8),
    rel("proj-delcampo", "person-mep", "depends-on", 0.6),
    rel("proj-delcampo", "person-civil", "depends-on", 0.6),
    rel("proj-delcampo", "person-geotech", "depends-on", 0.7),
    rel("proj-delcampo", "person-reviewer", "related-to", 0.7),
    rel("proj-marisol", "person-struct", "depends-on", 0.5),
    rel("proj-marisol", "person-mep", "depends-on", 0.5),
    rel("proj-atelier", "person-gc", "depends-on", 0.8),
    rel("proj-atelier", "person-la", "depends-on", 0.4),
    rel("proj-kestrel", "person-civil", "depends-on", 0.5),
  );

  // Agents assigned to projects.
  relationships.push(
    rel("agent-project", "proj-delcampo", "assigned-to", 0.9),
    rel("agent-code", "proj-delcampo", "assigned-to", 0.8),
    rel("agent-comm", "proj-delcampo", "assigned-to", 0.7),
    rel("agent-schedule", "proj-delcampo", "assigned-to", 0.6),
    rel("agent-zoning", "proj-delcampo", "assigned-to", 0.5),
    rel("agent-project", "proj-atelier", "assigned-to", 0.7),
    rel("agent-finance", "proj-atelier", "assigned-to", 0.7),
    rel("agent-project", "proj-marisol", "assigned-to", 0.6),
    rel("agent-research", "proj-kestrel", "assigned-to", 0.6),
    rel("agent-contract", "proj-sunset", "assigned-to", 0.7),
  );

  // --- tasks -----------------------------------------------------
  const tasks: {
    id: string;
    name: string;
    status: string;
    priority: string;
    due?: string;
    projectId: string;
  }[] = [
    { id: "task-egress", name: "Resolve Level 2 egress width conflict", status: "blocked", priority: "critical", due: day(2), projectId: "proj-delcampo" },
    { id: "task-permit-reply", name: "Respond to permit comment set 2", status: "in-progress", priority: "high", due: day(6), projectId: "proj-delcampo" },
    { id: "task-retaining", name: "Coordinate retaining wall detail with geotech", status: "in-progress", priority: "high", due: day(4), projectId: "proj-delcampo" },
    { id: "task-struct-rev", name: "Incorporate structural revision 01", status: "review", priority: "high", due: day(1), projectId: "proj-delcampo" },
    { id: "task-title24", name: "Update Title 24 compliance forms", status: "todo", priority: "medium", due: day(9), projectId: "proj-delcampo" },
    { id: "task-site-plan", name: "Revise site plan for grading ordinance", status: "todo", priority: "medium", due: day(8), projectId: "proj-delcampo" },
    { id: "task-rfi-14", name: "Answer RFI 14 — window head heights", status: "todo", priority: "medium", due: day(5), projectId: "proj-delcampo" },
    { id: "task-client-meet", name: "Prep agenda for client walkthrough", status: "todo", priority: "low", due: day(7), projectId: "proj-delcampo" },
    { id: "task-marisol-facade", name: "Facade module study", status: "in-progress", priority: "medium", due: day(14), projectId: "proj-marisol" },
    { id: "task-marisol-core", name: "Core layout options", status: "todo", priority: "medium", due: day(18), projectId: "proj-marisol" },
    { id: "task-kestrel-program", name: "Confirm program with city", status: "in-progress", priority: "high", due: day(12), projectId: "proj-kestrel" },
    { id: "task-atelier-punch", name: "Issue punch list round 1", status: "blocked", priority: "high", due: day(3), projectId: "proj-atelier" },
    { id: "task-atelier-payapp", name: "Review pay application 4", status: "todo", priority: "critical", due: day(-6), projectId: "proj-atelier" },
    { id: "task-sunset-scope", name: "Confirm revised scope with client", status: "blocked", priority: "high", due: day(-4), projectId: "proj-sunset" },
  ];
  tasks.forEach((t) => {
    add({
      id: t.id,
      category: "task",
      name: t.name,
      status: t.status as "todo" | "in-progress" | "blocked" | "review" | "done",
      priority: t.priority as "low" | "medium" | "high" | "critical",
      due: t.due,
      projectId: t.projectId,
    });
    relationships.push(rel(t.projectId, t.id, "owns", 0.8));
  });
  relationships.push(
    rel("task-egress", "agent-code", "assigned-to", 0.9),
    rel("task-permit-reply", "agent-comm", "assigned-to", 0.8),
    rel("task-retaining", "agent-project", "assigned-to", 0.7),
    rel("task-retaining", "person-geotech", "depends-on", 0.8),
    rel("task-struct-rev", "person-struct", "depends-on", 0.9),
    rel("task-site-plan", "agent-zoning", "assigned-to", 0.7),
    rel("task-title24", "agent-code", "assigned-to", 0.6),
    rel("task-egress", "task-struct-rev", "depends-on", 0.7),
    rel("task-permit-reply", "task-egress", "depends-on", 0.8),
    rel("task-permit-reply", "task-site-plan", "depends-on", 0.5),
    rel("task-atelier-payapp", "agent-finance", "assigned-to", 0.9),
    rel("task-atelier-punch", "person-gc", "depends-on", 0.7),
    rel("task-kestrel-program", "agent-research", "assigned-to", 0.6),
    rel("task-marisol-facade", "agent-project", "assigned-to", 0.5),
  );

  // --- communications ------------------------------------------
  const comms: {
    id: string;
    name: string;
    from: string;
    date: string;
    needsReply?: boolean;
    repliedAt?: string;
    projectId: string;
  }[] = [
    { id: "comm-permit-2", name: "Permit comment set 2 — plan check", from: "City of Alameda", date: day(-2), needsReply: true, projectId: "proj-delcampo" },
    { id: "comm-struct-rev", name: "Structural revision 01 issued", from: "Elena Marworks", date: day(-1), needsReply: true, projectId: "proj-delcampo" },
    { id: "comm-geo-memo", name: "Geotech memo: bearing at west slope", from: "Sam Ortiz", date: day(-3), needsReply: false, repliedAt: day(-2), projectId: "proj-delcampo" },
    { id: "comm-client-walk", name: "Can we walk the site Friday?", from: "Rosa del Campo", date: day(-1), needsReply: true, projectId: "proj-delcampo" },
    { id: "comm-rfi-14", name: "RFI 14 — window head heights", from: "Marcus Iyer", date: day(-2), needsReply: true, projectId: "proj-delcampo" },
    { id: "comm-mep-load", name: "MEP: revised electrical load", from: "Devon Pryce", date: day(-5), needsReply: false, repliedAt: day(-4), projectId: "proj-delcampo" },
    { id: "comm-atelier-pay", name: "Pay application 4 — please review", from: "Marcus Iyer", date: day(-7), needsReply: true, projectId: "proj-atelier" },
    { id: "comm-marisol-brief", name: "Updated design brief", from: "Marisol Group", date: day(-4), needsReply: false, repliedAt: day(-3), projectId: "proj-marisol" },
    { id: "comm-sunset-hold", name: "Placing project on hold", from: "Ridge Partners", date: day(-9), needsReply: true, projectId: "proj-sunset" },
    { id: "comm-kestrel-program", name: "Program questions from council", from: "City of Kestrel", date: day(-2), needsReply: true, projectId: "proj-kestrel" },
  ];
  comms.forEach((c) => {
    add({
      id: c.id,
      category: "communication",
      name: c.name,
      channel: "email",
      from: c.from,
      date: c.date,
      needsReply: c.needsReply,
      repliedAt: c.repliedAt,
      projectId: c.projectId,
    });
    relationships.push(rel(c.projectId, c.id, "owns", 0.5));
  });
  relationships.push(
    rel("comm-permit-2", "task-permit-reply", "generated", 0.9),
    rel("comm-permit-2", "task-egress", "generated", 0.7),
    rel("comm-permit-2", "task-site-plan", "generated", 0.6),
    rel("comm-struct-rev", "task-struct-rev", "generated", 0.9),
    rel("comm-rfi-14", "task-rfi-14", "generated", 0.9),
    rel("comm-client-walk", "task-client-meet", "generated", 0.8),
    rel("comm-atelier-pay", "task-atelier-payapp", "generated", 0.9),
    rel("comm-kestrel-program", "task-kestrel-program", "generated", 0.7),
    rel("comm-permit-2", "person-reviewer", "authored", 0.8),
    rel("comm-struct-rev", "person-struct", "authored", 0.9),
    rel("comm-rfi-14", "person-gc", "authored", 0.8),
    rel("comm-client-walk", "person-client-delcampo", "authored", 0.9),
  );

  // --- events -------------------------------------------------
  const events: {
    id: string;
    name: string;
    kind: string;
    start: string;
    projectId: string;
  }[] = [
    { id: "evt-permit-deadline", name: "Permit resubmittal deadline", kind: "deadline", start: day(6), projectId: "proj-delcampo" },
    { id: "evt-client-walk", name: "Client site walkthrough", kind: "meeting", start: day(3, 15), projectId: "proj-delcampo" },
    { id: "evt-struct-coord", name: "Structural coordination call", kind: "meeting", start: day(1, 11), projectId: "proj-delcampo" },
    { id: "evt-geo-inspect", name: "Geotech field inspection", kind: "inspection", start: day(4, 8), projectId: "proj-delcampo" },
    { id: "evt-dd-milestone", name: "DD set milestone", kind: "milestone", start: day(21), projectId: "proj-marisol" },
    { id: "evt-atelier-punch", name: "Punch walk", kind: "inspection", start: day(3, 9), projectId: "proj-atelier" },
    { id: "evt-kestrel-council", name: "Council program review", kind: "meeting", start: day(12, 13), projectId: "proj-kestrel" },
  ];
  events.forEach((e) => {
    add({
      id: e.id,
      category: "event",
      name: e.name,
      kind: e.kind as "meeting" | "deadline" | "milestone" | "inspection",
      start: e.start,
      projectId: e.projectId,
    });
    relationships.push(rel(e.projectId, e.id, "owns", 0.6));
  });
  relationships.push(
    rel("evt-struct-coord", "person-struct", "participates-in", 0.8),
    rel("evt-struct-coord", "agent-project", "participates-in", 0.5),
    rel("evt-client-walk", "person-client-delcampo", "participates-in", 0.9),
    rel("evt-geo-inspect", "person-geotech", "participates-in", 0.9),
    rel("evt-permit-deadline", "task-permit-reply", "related-to", 0.9),
    rel("evt-client-walk", "comm-client-walk", "related-to", 0.7),
    rel("evt-atelier-punch", "task-atelier-punch", "related-to", 0.8),
    rel("evt-kestrel-council", "task-kestrel-program", "related-to", 0.7),
  );

  // --- documents --------------------------------------------
  const docs: {
    id: string;
    name: string;
    docType: string;
    status: string;
    revision?: string;
    updatedAt: string;
    projectId: string;
  }[] = [
    { id: "doc-permit-set", name: "Permit set — Del Campo", docType: "drawing", status: "in-review", revision: "R2", updatedAt: day(-2), projectId: "proj-delcampo" },
    { id: "doc-struct-01", name: "Structural drawings Rev 01", docType: "drawing", status: "issued", revision: "01", updatedAt: day(-1), projectId: "proj-delcampo" },
    { id: "doc-site-plan", name: "Site & grading plan", docType: "drawing", status: "draft", revision: "C", updatedAt: day(-4), projectId: "proj-delcampo" },
    { id: "doc-geo-report", name: "Geotechnical report", docType: "report", status: "issued", updatedAt: day(-12), projectId: "proj-delcampo" },
    { id: "doc-permit-comments", name: "Plan check comments set 2", docType: "permit", status: "issued", updatedAt: day(-2), projectId: "proj-delcampo" },
    { id: "doc-rfi-14", name: "RFI 14 log", docType: "rfi", status: "draft", updatedAt: day(-2), projectId: "proj-delcampo" },
    { id: "doc-title24", name: "Title 24 report", docType: "report", status: "superseded", updatedAt: day(-20), projectId: "proj-delcampo" },
    { id: "doc-marisol-dd", name: "Marisol DD narrative", docType: "spec", status: "draft", updatedAt: day(-3), projectId: "proj-marisol" },
    { id: "doc-atelier-contract", name: "Atelier Nine — GC contract", docType: "contract", status: "issued", updatedAt: day(-60), projectId: "proj-atelier" },
    { id: "doc-atelier-payapp", name: "Pay application 4", docType: "submittal", status: "in-review", updatedAt: day(-7), projectId: "proj-atelier" },
  ];
  docs.forEach((d) => {
    add({
      id: d.id,
      category: "document",
      name: d.name,
      docType: d.docType as "drawing" | "spec" | "contract" | "permit" | "report" | "rfi" | "submittal",
      status: d.status as "draft" | "in-review" | "issued" | "superseded",
      revision: d.revision,
      updatedAt: d.updatedAt,
      projectId: d.projectId,
    });
    relationships.push(rel(d.projectId, d.id, "owns", 0.55));
  });
  relationships.push(
    rel("doc-struct-01", "person-struct", "authored", 0.9),
    rel("doc-geo-report", "person-geotech", "authored", 0.9),
    rel("doc-permit-comments", "person-reviewer", "authored", 0.9),
    rel("doc-permit-set", "know-egress", "references", 0.7),
    rel("doc-permit-set", "know-title24", "references", 0.5),
    rel("doc-site-plan", "know-hillside", "references", 0.8),
    rel("doc-site-plan", "know-setbacks", "references", 0.6),
    rel("doc-struct-01", "know-retaining", "references", 0.7),
    rel("doc-struct-01", "task-struct-rev", "related-to", 0.8),
    rel("doc-permit-comments", "comm-permit-2", "related-to", 0.9),
    rel("doc-rfi-14", "task-rfi-14", "related-to", 0.9),
    rel("doc-permit-set", "task-permit-reply", "related-to", 0.8),
    rel("doc-atelier-payapp", "task-atelier-payapp", "related-to", 0.9),
    rel("agent-document", "doc-permit-set", "authored", 0.4),
  );

  // --- ideas & research -----------------------------------
  const ideas: { id: string; name: string; stage: string }[] = [
    { id: "idea-cantilever", name: "Cantilever the west bedroom over the slope", stage: "exploring" },
    { id: "idea-shotcrete", name: "Shotcrete retaining instead of CIP", stage: "validated" },
    { id: "idea-prefab-core", name: "Prefabricated stair/elevator core (Marisol)", stage: "spark" },
    { id: "idea-daylight", name: "Daylight-modeled facade fins", stage: "exploring" },
  ];
  ideas.forEach((i) =>
    add({ id: i.id, category: "idea", name: i.name, stage: i.stage as "spark" | "exploring" | "validated" | "archived" }),
  );
  relationships.push(
    rel("idea-cantilever", "proj-delcampo", "about", 0.7),
    rel("idea-cantilever", "know-precedent-hill", "about", 0.8),
    rel("idea-shotcrete", "proj-delcampo", "about", 0.7),
    rel("idea-shotcrete", "know-shotcrete", "about", 0.9),
    rel("idea-shotcrete", "task-retaining", "related-to", 0.6),
    rel("idea-prefab-core", "proj-marisol", "about", 0.7),
    rel("idea-prefab-core", "task-marisol-core", "related-to", 0.5),
    rel("idea-daylight", "proj-marisol", "about", 0.6),
    rel("idea-daylight", "task-marisol-facade", "related-to", 0.6),
    rel("agent-research", "idea-cantilever", "related-to", 0.6),
    rel("agent-research", "know-precedent-hill", "about", 0.7),
  );

  // --- executions (recent agent runs) --------------------
  const execs: {
    id: string;
    name: string;
    agentId: string;
    outcome: string;
    startedAt: string;
    finishedAt?: string;
  }[] = [
    { id: "exec-code-egress", name: "Analyze egress at Level 2", agentId: "agent-code", outcome: "partial", startedAt: day(0, 8), finishedAt: day(0, 8) },
    { id: "exec-comm-draft", name: "Draft permit reviewer reply", agentId: "agent-comm", outcome: "running", startedAt: day(0, 9) },
    { id: "exec-research-hill", name: "Precedent search: hillside homes", agentId: "agent-research", outcome: "success", startedAt: day(-1, 14), finishedAt: day(-1, 15) },
    { id: "exec-finance-payapp", name: "Reconcile pay application 4", agentId: "agent-finance", outcome: "failed", startedAt: day(-1, 10), finishedAt: day(-1, 10) },
    { id: "exec-project-board", name: "Sync Del Campo task board", agentId: "agent-project", outcome: "success", startedAt: day(0, 7), finishedAt: day(0, 7) },
  ];
  execs.forEach((x) => {
    add({
      id: x.id,
      category: "execution",
      name: x.name,
      agentId: x.agentId,
      outcome: x.outcome as "success" | "partial" | "failed" | "running",
      startedAt: x.startedAt,
      finishedAt: x.finishedAt,
    });
    relationships.push(rel(x.agentId, x.id, "generated", 0.6));
  });
  relationships.push(
    rel("exec-code-egress", "task-egress", "about", 0.8),
    rel("exec-comm-draft", "task-permit-reply", "about", 0.8),
    rel("exec-research-hill", "idea-cantilever", "about", 0.6),
    rel("exec-finance-payapp", "task-atelier-payapp", "about", 0.8),
    rel("exec-project-board", "proj-delcampo", "about", 0.5),
  );

  // --- services --------------------------------------
  const services: { id: string; name: string; status: string }[] = [
    { id: "svc-core", name: "Core Engine Runtime", status: "online" },
    { id: "svc-vault", name: "Knowledge Index", status: "online" },
    { id: "svc-mail", name: "Mail Sync", status: "degraded" },
    { id: "svc-calendar", name: "Calendar Sync", status: "online" },
    { id: "svc-permit", name: "Permit Portal Link", status: "online" },
  ];
  services.forEach((s) =>
    add({ id: s.id, category: "service", name: s.name, status: s.status as "online" | "degraded" | "offline" }),
  );
  relationships.push(
    rel("svc-mail", "tool-gmail", "related-to", 0.8),
    rel("svc-calendar", "tool-calendar", "related-to", 0.8),
    rel("svc-vault", "tool-vault", "related-to", 0.8),
    rel("svc-permit", "tool-permit-portal", "related-to", 0.8),
  );

  // Cross-project knowledge use.
  relationships.push(
    rel("proj-delcampo", "know-egress", "related-to", 0.4),
    rel("proj-delcampo", "know-hillside", "related-to", 0.5),
    rel("proj-marisol", "know-title24", "related-to", 0.3),
  );

  const entityMap: Record<string, Entity> = {};
  for (const e of entities) entityMap[e.id] = e;

  // Drop any relationship that points at an unknown id (keeps the graph clean).
  const valid = relationships.filter(
    (r) => entityMap[r.source] && entityMap[r.target],
  );

  return { entities: entityMap, relationships: valid, now: NOW_ISO };
}

export const AGENT_IDS = [
  "agent-lola",
  "agent-project",
  "agent-schedule",
  "agent-research",
  "agent-code",
  "agent-zoning",
  "agent-contract",
  "agent-comm",
  "agent-task",
  "agent-knowledge",
  "agent-document",
  "agent-finance",
];
