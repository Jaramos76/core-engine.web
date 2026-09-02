// Intelligent command interpreter for Lola and the command palette.
//
// Not an LLM — a deterministic intent parser over the dataset. It recognizes
// the natural-language patterns the workspace is navigated by and returns a
// typed `CommandResult` the OS store knows how to apply. When a real language
// model is connected, it can emit the same `CommandResult` union.

import type {
  Category,
  CommandResult,
  Dataset,
  Entity,
  OSView,
} from "./types";

const CATEGORY_WORDS: Record<string, Category> = {
  project: "project",
  projects: "project",
  agent: "agent",
  agents: "agent",
  task: "task",
  tasks: "task",
  todo: "task",
  todos: "task",
  priority: "task",
  priorities: "task",
  email: "communication",
  emails: "communication",
  mail: "communication",
  message: "communication",
  messages: "communication",
  communication: "communication",
  communications: "communication",
  person: "person",
  people: "person",
  consultant: "person",
  consultants: "person",
  team: "person",
  meeting: "event",
  meetings: "event",
  event: "event",
  events: "event",
  schedule: "event",
  calendar: "event",
  document: "document",
  documents: "document",
  doc: "document",
  docs: "document",
  drawing: "document",
  drawings: "document",
  knowledge: "knowledge",
  idea: "idea",
  ideas: "idea",
  research: "knowledge",
  tool: "tool",
  tools: "tool",
};

const STOPWORDS = new Set([
  "the", "a", "an", "me", "my", "to", "for", "of", "on", "in", "is", "are",
  "show", "open", "find", "everything", "anything", "all", "related", "connected",
  "about", "with", "and", "please", "give", "list", "isolate", "focus", "go",
  "residence", "tower", "center", "project", "duplex", "nine",
]);

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
}

function significantTokens(text: string): string[] {
  return normalize(text)
    .split(" ")
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/**
 * Recall-weighted fuzzy score: how much of the entity name the query covers.
 * Extra words in the query (e.g. "show me everything related to …") don't hurt.
 * 0..1
 */
function matchScore(query: string, name: string): number {
  const q = normalize(query);
  const n = normalize(name);
  if (!q || !n) return 0;
  if (n === q) return 1;
  if (q.includes(n)) return 0.95;
  if (n.includes(q) && q.length >= 3) return 0.9;

  const nameTokens = significantTokens(name);
  if (nameTokens.length === 0) {
    return n.split(" ").some((t) => q.includes(t)) ? 0.6 : 0;
  }
  const qSet = new Set(normalize(query).split(" "));
  const hits = nameTokens.filter(
    (t) => qSet.has(t) || [...qSet].some((x) => x.length > 2 && (x.startsWith(t) || t.startsWith(x))),
  ).length;
  return (hits / nameTokens.length) * 0.85;
}

export function searchEntities(
  dataset: Dataset,
  query: string,
  limit = 8,
): Entity[] {
  const q = normalize(query);
  if (!q) return [];
  return Object.values(dataset.entities)
    .map((e) => ({ e, s: matchScore(query, e.name) + (normalize(e.summary ?? "").includes(q) ? 0.15 : 0) }))
    .filter((x) => x.s > 0.25)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.e);
}

function bestEntity(
  dataset: Dataset,
  query: string,
  category?: Category,
  threshold = 0.34,
): Entity | null {
  const pool = Object.values(dataset.entities).filter(
    (e) => !category || e.category === category,
  );
  let best: Entity | null = null;
  let bestScore = threshold;
  for (const e of pool) {
    const s = matchScore(query, e.name);
    if (s > bestScore) {
      best = e;
      bestScore = s;
    }
  }
  return best;
}

function detectCategories(text: string): Category[] {
  const found = new Set<Category>();
  for (const word of normalize(text).split(" ")) {
    const cat = CATEGORY_WORDS[word];
    if (cat) found.add(cat);
  }
  return [...found];
}

export function interpretCommand(
  rawInput: string,
  dataset: Dataset,
): CommandResult {
  const text = rawInput.trim();
  const t = normalize(text);

  if (!t) return { kind: "reply", note: "Say the word." };

  // Attention / "what needs me"
  const attentionCue =
    /\b(attention|priorit|priorities|urgent|today|finish|do next|what.*(need|require)|need(s)? me|requir|overdue|unresolved|blocked|blocker|at risk|falling behind|behind|stuck)\b/;
  if (
    attentionCue.test(t) &&
    !/\b(timeline|schedule|agent)\b/.test(t)
  ) {
    return {
      kind: "attention-today",
      note: "Surfacing what needs you now — most urgent moving to the front.",
    };
  }

  // View switches
  const viewMatch: [RegExp, OSView][] = [
    [/\btimeline\b/, "timeline"],
    [/\b(schedule|calendar|dates)\b/, "timeline"],
    [/\b(attention|alerts)\b/, "attention"],
    [/\bagents?\b/, "agents"],
    [/\b(graph|map|network|constellation)\b/, "graph"],
  ];
  for (const [re, view] of viewMatch) {
    if (re.test(t) && /^(show|open|go to|switch to|view)\b/.test(t)) {
      return { kind: "set-view", view, note: `Switched to the ${view} view.` };
    }
  }

  // Ask an agent
  const askAgent = t.match(
    /\b(ask|tell|have|get)\b.*\b(agent|lola|code|zoning|schedule|research|contract|finance|document|knowledge|communication)\b/,
  );
  if (askAgent) {
    const agent =
      bestEntity(dataset, text.replace(/\b(ask|tell|have|get|the|agent to|agent)\b/gi, " "), "agent") ??
      bestEntity(dataset, text, "agent");
    if (agent) {
      const prompt = text.replace(/^.*?\bagent\b/i, "").replace(/^\s*(to|:)?\s*/i, "").trim();
      return {
        kind: "ask-agent",
        agentId: agent.id,
        prompt: prompt || "Investigate the active context",
        note: `Routed to ${agent.name}.`,
      };
    }
  }

  // Clear / reset
  if (/^(clear|reset|deselect|home|show everything|full (graph|network))/.test(t)) {
    return { kind: "clear", note: "Cleared focus — full network." };
  }

  // "show / open / find <thing>" or "everything related to <thing>"
  const showMatch = t.match(
    /\b(show|open|find|isolate|focus( on)?|everything (related to|connected to|about)|related to)\b\s+(.*)$/,
  );
  const categories = detectCategories(text);

  if (showMatch) {
    const target = showMatch[showMatch.length - 1].trim();

    // Prefer a project isolation when a project name matches.
    const project = bestEntity(dataset, target, "project");
    if (project) {
      return {
        kind: "focus-project",
        projectId: project.id,
        note: `Isolating the ${project.name} network.`,
      };
    }

    // Any entity match → select it.
    const entity = bestEntity(dataset, target);
    if (entity) {
      return {
        kind: "select",
        entityId: entity.id,
        note: `Focused on ${entity.name}.`,
      };
    }

    // No entity, but a category → filter.
    if (categories.length) {
      return {
        kind: "filter",
        categories,
        note: `Filtered to ${categories.join(", ")}.`,
      };
    }

    // Fall back to a text search.
    return { kind: "search", query: target, note: `Searching for “${target}”.` };
  }

  // Bare category mention → filter
  if (categories.length && t.split(" ").length <= 4) {
    return {
      kind: "filter",
      categories,
      note: `Filtered to ${categories.join(", ")}.`,
    };
  }

  // Bare entity name — a project match wins (operators usually mean the project).
  const bareProject = bestEntity(dataset, text, "project");
  if (bareProject) {
    return {
      kind: "focus-project",
      projectId: bareProject.id,
      note: `Isolating the ${bareProject.name} network.`,
    };
  }
  const bare = bestEntity(dataset, text);
  if (bare) {
    return { kind: "select", entityId: bare.id, note: `Focused on ${bare.name}.` };
  }

  return { kind: "search", query: text, note: `Searching for “${text}”.` };
}

export const LOLA_SUGGESTIONS = [
  "Show me everything related to Del Campo",
  "What requires my attention today?",
  "Show emails related to permit revisions",
  "Find projects with unresolved consultant issues",
  "Ask the Building Code Agent to investigate the egress conflict",
  "Show the timeline",
];
