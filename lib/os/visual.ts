// Visual language for the OS: how each entity category is coloured and shaped.
// Colour encodes meaning; shape encodes kind. Kept restrained — no pure neon.

import type { AgentState, Category, Urgency } from "./types";

export type NodeShape =
  | "icosahedron"
  | "octahedron"
  | "box"
  | "sphere"
  | "tetrahedron"
  | "dodecahedron"
  | "cone"
  | "torus"
  | "cylinder"
  | "ring";

export interface CategoryVisual {
  label: string;
  plural: string;
  color: string;
  shape: NodeShape;
  /** base radius multiplier in the 3D graph */
  scale: number;
  blurb: string;
}

export const CATEGORY: Record<Category, CategoryVisual> = {
  project: {
    label: "Project",
    plural: "Projects",
    color: "#5eead4",
    shape: "icosahedron",
    scale: 1.4,
    blurb: "A body of work with its own constellation of tasks, people and documents.",
  },
  agent: {
    label: "Agent",
    plural: "Agents",
    color: "#b79cff",
    shape: "octahedron",
    scale: 1.12,
    blurb: "An AI worker with a role, tools and knowledge sources.",
  },
  task: {
    label: "Task",
    plural: "Tasks",
    color: "#eab35c",
    shape: "box",
    scale: 0.9,
    blurb: "A unit of work with an owner, a due date and dependencies.",
  },
  person: {
    label: "Person",
    plural: "People",
    color: "#79a9f0",
    shape: "sphere",
    scale: 1,
    blurb: "A client, consultant or collaborator.",
  },
  communication: {
    label: "Communication",
    plural: "Communications",
    color: "#f08fae",
    shape: "tetrahedron",
    scale: 0.85,
    blurb: "An email or message — often the source of a task or decision.",
  },
  event: {
    label: "Event",
    plural: "Schedule",
    color: "#6fd08a",
    shape: "cone",
    scale: 0.9,
    blurb: "A meeting, deadline, milestone or inspection in time.",
  },
  document: {
    label: "Document",
    plural: "Documents",
    color: "#a6b2c6",
    shape: "box",
    scale: 0.95,
    blurb: "A drawing, spec, contract, permit or report with revisions.",
  },
  knowledge: {
    label: "Knowledge",
    plural: "Knowledge",
    color: "#e5cf76",
    shape: "dodecahedron",
    scale: 1,
    blurb: "A durable fact, standard or precedent agents can draw on.",
  },
  idea: {
    label: "Idea",
    plural: "Ideas",
    color: "#d08ce0",
    shape: "tetrahedron",
    scale: 0.9,
    blurb: "A design or process direction being explored.",
  },
  tool: {
    label: "Tool",
    plural: "Tools",
    color: "#5fc6d4",
    shape: "torus",
    scale: 0.8,
    blurb: "A capability an agent can invoke — API, skill or integration.",
  },
  execution: {
    label: "Execution",
    plural: "Executions",
    color: "#8a93a3",
    shape: "sphere",
    scale: 0.6,
    blurb: "A recorded agent run and its outcome.",
  },
  service: {
    label: "Service",
    plural: "System",
    color: "#8fc7a8",
    shape: "ring",
    scale: 0.85,
    blurb: "A connected Core Engine service.",
  },
};

export const URGENCY_COLOR: Record<Urgency, string> = {
  watch: "#79a9f0",
  soon: "#eab35c",
  now: "#f0736f",
};

export const AGENT_STATE_META: Record<
  AgentState,
  { label: string; color: string; active: boolean }
> = {
  idle: { label: "Idle", color: "#62686f", active: false },
  thinking: { label: "Thinking", color: "#b79cff", active: true },
  researching: { label: "Researching", color: "#5fc6d4", active: true },
  waiting: { label: "Waiting", color: "#79a9f0", active: false },
  executing: { label: "Executing", color: "#5eead4", active: true },
  blocked: { label: "Blocked", color: "#f0736f", active: false },
  completed: { label: "Completed", color: "#6fd08a", active: false },
  attention: { label: "Attention", color: "#eab35c", active: true },
};

/** Left-nav lenses. Each focuses the graph on one or more categories. */
export const NAV_LENSES: {
  id: string;
  label: string;
  categories: Category[] | null;
}[] = [
  { id: "home", label: "Home", categories: null },
  { id: "projects", label: "Projects", categories: ["project"] },
  { id: "agents", label: "Agents", categories: ["agent", "execution", "tool"] },
  { id: "knowledge", label: "Knowledge", categories: ["knowledge", "idea"] },
  { id: "communications", label: "Communications", categories: ["communication"] },
  { id: "schedule", label: "Schedule", categories: ["event"] },
  { id: "documents", label: "Documents", categories: ["document"] },
  { id: "ideas", label: "Ideas", categories: ["idea"] },
  { id: "research", label: "Research", categories: ["knowledge", "idea"] },
  { id: "tools", label: "Tools", categories: ["tool", "service"] },
  { id: "system", label: "System", categories: ["service", "agent"] },
];
