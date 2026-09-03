// Deterministic heuristics for cleaning noisy Vault-triage data during import.
// No AI. Conservative: only *known boilerplate* is dropped; everything else
// becomes a task, and low-confidence ones are flagged for human review rather
// than deleted.

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
    "Ideas",
    "Idea Inbox",
    "Knowledge",
  ].map((s) => s.toLowerCase()),
);

export function isNavLink(target: string): boolean {
  return NAV_TARGETS.has(target.trim().toLowerCase());
}

// Legal / signature / footer boilerplate — never a task.
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
  /all contents and images contained/i,
  /before the business owner before paying/i,
  /^\s*(thank you|thanks|thx|best regards|regards|kind regards|sincerely|cheers|best|br)[.,!]?\s*$/i,
];

// Conversational filler / email closings — grammatically imperative but not a
// task. These are the bulk of what triage over-extracts from message bodies.
const FILLER_PATTERNS: RegExp[] = [
  /^please (find|see) (it |the )?(attached|enclosed)/i,
  /^(attached|enclosed|here) (please find|is|are|you (will|'ll) find)/i,
  /please find (attached|enclosed)/i,
  /^based on our (conversation|call|discussion|meeting)/i,
  /^in the meantime\b/i,
  /^(please )?let (me|us) know if you (have|need|require)/i,
  /let me know if you need anything/i,
  /^please (let me know|advise|confirm receipt)/i,
  /^(please )?keep (me|us) posted/i,
  /^i('| wi)ll (get back to you|keep you posted|follow up|send you|update you|revert)/i,
  /^(please )?revert (back )?(to me )?(with|once|when)/i,
  /^(let'?s|we can) (circle back|touch base|reconnect|follow up)/i,
  /^should you have any (questions|concerns)/i,
  /^(if you have any|for any) (questions|concerns|clarification)/i,
  /at your earliest convenience\s*$/i,
  /^(please )?(note|fyi)[:\s]/i,
  /^(hi|hello|dear|good (morning|afternoon|evening))\b.{0,40}$/i,
  /^thank you (for|so much|again)\b/i,
  /^(as|per) (discussed|requested|agreed|our conversation)\s*[.,]?\s*$/i,
  /^(no|any) (action|response) (required|needed)/i,
  /^this is (just )?a (reminder|follow[- ]?up|friendly reminder)/i,
  /for your (review|reference|records|information)\s*[.,]?\s*$/i,
  /^looking forward to/i,
  /^have a (great|good|nice)\b/i,
  /^talk (soon|later)/i,
  /^(please )?disregard\b/i,
  /^i hope (this|you|all)/i,
  /^feel free to\b/i,
  /^(we|i) (appreciate|thank you for) your (patience|time|help|cooperation)/i,
  /^can you (please )?(let me know|advise|update me|confirm) (if|whether|on any|about any)/i,
  /^(please )?let me know (your thoughts|if this works|a good time|when you)/i,
  /^(i|we) (will|'ll) (get|be) (back|in touch)/i,
  /^(please )?see (below|above|the (thread|chain|email below))/i,
  /^(as )?(mentioned|noted) (below|above|earlier)/i,
  /^(great|perfect|sounds good|understood|noted|will do|ok|okay)[.,!]?\s/i,
  /^(please )?find (below|the following)/i,
  /^(thanks|thank you) (in advance|for your (help|time|patience|prompt))/i,
  /^(we|i) (received|got) (your|the)/i,
  /^(this|it) (is|will be) (attached|below)/i,
  /pending your (signature|review|approval)\s*$/i,
];

const ACTION_VERBS =
  /^(please\s+)?(send|review|check|confirm|provide|coordinate|update|prepare|submit|revise|verify|incorporate|schedule|follow[- ]?up|call|email|forward|upload|attach|complete|finalize|issue|respond|reply|ask|request|obtain|collect|gather|draft|create|add|remove|fix|resolve|address|clarify|discuss|meet|contact|reach out|get|make sure|ensure|need to|remember to|don'?t forget)/i;

const WORK_NOUNS =
  /\b(drawing|drawings|permit|permit set|set|sheet|rfi|submittal|estimate|estimating|calc|calculation|energy calc|plan|plans|revision|structural|mep|civil|survey|inspection|invoice|proposal|contract|scope|deadline|deliverable|comment|correction)\b/i;

const DUE_HINT =
  /\b(by\s+(mon|tue|wed|thu|fri|sat|sun|today|tomorrow|end of|eod|cob)|before\s+\w+|due\s+\w+|asap|this week|next week|by\s+\d)/i;

export type Disposition = "keep" | "review" | "skip";

export interface ActionItemVerdict {
  disposition: Disposition;
  confidence: number; // 0..1
  reason: string;
}

/**
 * Score a candidate action item. Returns:
 *   skip   — matched a known boilerplate/signature pattern (recorded in report)
 *   keep   — confidence >= 0.6, imports as a normal task
 *   review — 0 < confidence < 0.6, imports as a task with review_required = true
 */
export function classifyActionItem(text: string): ActionItemVerdict {
  // Normalize smart quotes so patterns like /let's/ match Vault text.
  const t = text.trim().replace(/[‘’‛]/g, "'").replace(/[“”]/g, '"');

  if (t.length < 6) return { disposition: "skip", confidence: 0, reason: "too short" };
  if (t.split(/\s+/).length < 3) return { disposition: "skip", confidence: 0, reason: "not a phrase" };
  for (const re of BOILERPLATE_PATTERNS) {
    if (re.test(t)) return { disposition: "skip", confidence: 0, reason: "email boilerplate / signature" };
  }
  for (const re of FILLER_PATTERNS) {
    if (re.test(t)) return { disposition: "skip", confidence: 0, reason: "conversational filler / closing" };
  }
  if (/^<?https?:\/\/\S{0,40}$/i.test(t) || /^<https?:\/\/links?$/i.test(t)) {
    return { disposition: "skip", confidence: 0, reason: "truncated link" };
  }
  if (/@\S+\.(com|net|org|gov)\b/i.test(t) && t.length < 60 && !/\b(send|email|contact|forward)\b/i.test(t)) {
    return { disposition: "skip", confidence: 0, reason: "quoted contact line" };
  }
  if (/^(from|sent|to|subject|cc|date):/i.test(t)) {
    return { disposition: "skip", confidence: 0, reason: "quoted email header" };
  }

  let score = 0.35; // base: it was in an "Action Items" list
  const reasons: string[] = [];

  if (ACTION_VERBS.test(t)) {
    score += 0.35;
    reasons.push("starts with an action verb");
  }
  if (WORK_NOUNS.test(t)) {
    score += 0.12;
    reasons.push("mentions project work");
  }
  if (DUE_HINT.test(t)) {
    score += 0.12;
    reasons.push("has a timing hint");
  }
  if (/\b(you|we|i|andres|please)\b/i.test(t)) score += 0.05;

  if (t.length > 220) {
    score -= 0.35;
    reasons.push("long — likely a sentence, not a task");
  } else if (t.length > 140) {
    score -= 0.1;
  }
  if (/^[A-Z0-9 ,.'"-]{16,}$/.test(t)) {
    score -= 0.25;
    reasons.push("all caps");
  }
  if (t.endsWith("?") && !ACTION_VERBS.test(t)) {
    score -= 0.08;
  }
  if (/\bhttps?:\/\//i.test(t)) score -= 0.12;

  const confidence = Math.max(0, Math.min(1, Number(score.toFixed(2))));
  if (confidence >= 0.6) {
    return { disposition: "keep", confidence, reason: reasons.join(", ") || "clear action item" };
  }
  return {
    disposition: "review",
    confidence,
    reason: reasons.length ? `low confidence: ${reasons.join(", ")}` : "ambiguous phrasing",
  };
}

/** Map a Vault email `status` to our normalized status. */
export function emailStatus(raw: string | null, inArchiveFolder = false): string {
  if (inArchiveFolder) return "archived";
  if (!raw) return "inbox";
  const s = raw.toLowerCase();
  if (s.includes("archive")) return "archived";
  if (s.includes("filed")) return "filed";
  return "inbox";
}

/** Rough person-vs-noreply check for email senders. */
export function looksLikePerson(name: string | null, email: string | null): boolean {
  const e = (email ?? "").toLowerCase();
  if (
    /no-?reply|notification|donotreply|quickbooks|mailer-daemon|postmaster|automated|do-not-reply|@notification|@intuit|@e\.|@email\./.test(
      e,
    )
  ) {
    return false;
  }
  const n = (name ?? "").trim();
  return n.length > 1 && /[a-z]/i.test(n);
}
