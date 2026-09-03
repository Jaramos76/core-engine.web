// Heuristics for cleaning noisy Vault-triage data during import. Conservative:
// when unsure, keep the item. Everything skipped is listed in the report.

// Navigation / hub notes — wikilinks to these are UI chrome, not relationships.
export const NAV_TARGETS = new Set(
  [
    "Home",
    "Work",
    "Work Dashboard",
    "Work Projects",
    "Work Consultants",
    "Work Tasks",
    "Projects Command Center",
    "Knowledge Hub",
    "Personal Dashboard",
    "Graph Command Center",
    "Vault Sunburst",
    "LOLA OS Settings",
    "Core Engine - Idea Network",
    "Daily Notes Hub",
  ].map((s) => s.toLowerCase()),
);

export function isNavLink(target: string): boolean {
  return NAV_TARGETS.has(target.trim().toLowerCase());
}

const BOILERPLATE_PATTERNS: RegExp[] = [
  /consider the environment before printing/i,
  /received this email in error/i,
  /unauthorized (disclosure|use|reproduction|distribution)/i,
  /confidential(ity)? (statement|notice)/i,
  /this (e-?mail|message) and any attachment/i,
  /please (call|contact) us at [\d)( -]+/i,
  /copyright statement/i,
  /^view and pay\b/i,
  /seems fraudulent, please check/i,
  /exclusive property of/i,
  /delete this message immediately/i,
  /^\s*[-–]{2,}\s*$/,
  /unsubscribe/i,
  /^sent from my (i?phone|ipad|android)/i,
];

export interface ActionItemVerdict {
  keep: boolean;
  reason: string;
}

export function classifyActionItem(text: string): ActionItemVerdict {
  const t = text.trim();
  if (t.length < 4) return { keep: false, reason: "too short" };
  if (t.length > 400) return { keep: false, reason: "paragraph, not a task" };
  for (const re of BOILERPLATE_PATTERNS) {
    if (re.test(t)) return { keep: false, reason: "email boilerplate" };
  }
  // A bare truncated URL fragment.
  if (/^<?https?:\/\/\S{0,40}$/i.test(t) || /^<https?:\/\/links?$/i.test(t)) {
    return { keep: false, reason: "truncated link" };
  }
  return { keep: true, reason: "actionable" };
}

/** Map a Vault email `status` to our normalized status. */
export function emailStatus(raw: string | null): string {
  if (!raw) return "inbox";
  const s = raw.toLowerCase();
  if (s.includes("archive")) return "archived";
  if (s.includes("filed")) return "filed";
  return "inbox";
}

/** Rough person-vs-noreply check for email senders. */
export function looksLikePerson(name: string | null, email: string | null): boolean {
  const e = (email ?? "").toLowerCase();
  if (/no-?reply|notification|donotreply|quickbooks|mailer-daemon|postmaster|automated/.test(e)) {
    return false;
  }
  const n = (name ?? "").trim();
  return n.length > 1 && /[a-z]/i.test(n);
}
