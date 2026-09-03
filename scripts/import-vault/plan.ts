import type { LinkStage, PendingLink, Plan, Ref, Report } from "./types";

export function emptyReport(scope: string, vaultPath: string): Report {
  return {
    scope,
    vaultPath,
    filesScanned: 0,
    detected: {},
    imported: {},
    relationships: 0,
    reviewRequiredTasks: 0,
    tasksSkipped: [],
    unresolvedProjectAssociations: [],
    warnings: [],
    duplicates: [],
    errors: [],
  };
}

export function newPlan(scope: string, vaultPath: string): Plan {
  return {
    projects: new Map(),
    contacts: new Map(),
    communications: new Map(),
    meetings: new Map(),
    meetingExtras: new Map(),
    knowledge: new Map(),
    ideas: new Map(),
    documents: new Map(),
    tasks: [],
    taskKeys: new Set(),
    links: [],
    pendingLinks: [],
    tags: new Set(),
    titleIndex: new Map(),
    report: emptyReport(scope, vaultPath),
  };
}

export function bump(rec: Record<string, number>, key: string, by = 1) {
  rec[key] = (rec[key] ?? 0) + by;
}

export function normTitle(s: string): string {
  return s
    .toLowerCase()
    .replace(/\.md$/, "")
    .replace(/[|#].*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Register a title so later wikilinks can resolve to this entity. */
export function indexTitle(plan: Plan, title: string, ref: Ref) {
  const n = normTitle(title);
  if (n && !plan.titleIndex.has(n)) plan.titleIndex.set(n, ref);
}

export function addLink(plan: Plan, link: LinkStage) {
  plan.links.push(link);
}

export function addPendingLink(plan: Plan, link: PendingLink) {
  plan.pendingLinks.push(link);
}

/** Resolve staged wikilink refs against the title index; unmatched → warning. */
export function resolvePendingLinks(plan: Plan) {
  for (const p of plan.pendingLinks) {
    const target = plan.titleIndex.get(normTitle(p.toTitle));
    if (!target) {
      plan.report.warnings.push(
        `unresolved wikilink [[${p.toTitle}]] from ${p.from.type}:${p.from.key}`,
      );
      continue;
    }
    if (target.type === p.from.type && target.key === p.from.key) continue; // self
    plan.links.push({
      from: p.from,
      to: target,
      relation: p.relation,
      origin: p.origin,
      confidence: 0.7,
    });
  }
}

function normName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/,?\s*(aia|pa|pe|ra|llc|inc|p\.?a\.?)\b\.?/gi, "")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Add or merge a contact, identified by email if present else by normalized
 * name. Returns the stable plan key.
 */
export function resolveContact(
  plan: Plan,
  fields: Record<string, unknown> & { name: string; email?: string | null },
): string {
  const email = (fields.email as string | null)?.toLowerCase() || null;
  const nn = normName(fields.name);

  for (const [k, existing] of plan.contacts) {
    const exEmail = (existing.email as string | null)?.toLowerCase() || null;
    const exName = normName((existing.name as string) ?? "");
    const match =
      (email && exEmail && email === exEmail) ||
      (!email && nn && nn === exName) ||
      (email && !exEmail && nn === exName);
    if (match) {
      for (const [key, val] of Object.entries(fields)) {
        if (val == null || val === "") continue;
        if (existing[key] == null || existing[key] === "") existing[key] = val;
      }
      if (fields.isConsultant) existing.isConsultant = true;
      return k;
    }
  }
  const key = email ? `email:${email}` : `name:${nn || fields.name.toLowerCase()}`;
  // sourcePath must be unique per contact — it is half the upsert key.
  const sourcePath = (fields.sourcePath as string) || key;
  plan.contacts.set(key, { ...fields, sourcePath });
  indexTitle(plan, fields.name, { type: "contact", key });
  return key;
}
