// Core Engine OS — domain model.
//
// Every object in the workspace is an `Entity` with a `category`. Entities are
// connected by a normalized `Relationship` list, so new categories and edge
// kinds can be added without touching the visualization engine. The graph layer
// (`graph.ts`) turns entities + relationships into renderable nodes and edges.

export type Category =
  | "project"
  | "agent"
  | "task"
  | "person"
  | "communication"
  | "event"
  | "document"
  | "knowledge"
  | "idea"
  | "tool"
  | "execution"
  | "service";

export type RelationshipType =
  | "owns" // project owns task / document / event
  | "assigned-to" // task assigned-to agent / person
  | "depends-on" // task depends-on task; project depends-on person
  | "blocks" // issue blocks project
  | "references" // document references knowledge
  | "participates-in" // person participates-in event
  | "generated" // communication generated task; event generated decision
  | "authored" // person/agent authored document
  | "uses" // agent uses tool / knowledge
  | "about" // idea about tool; research about knowledge
  | "related-to"; // generic

export interface EntityBase {
  id: string;
  category: Category;
  /** Display label used everywhere (graph, inspector, search). */
  name: string;
  summary?: string;
}

export type ProjectStatus =
  | "active"
  | "on-hold"
  | "permitting"
  | "construction"
  | "closeout";
export type Health = "on-track" | "at-risk" | "blocked";

export interface Project extends EntityBase {
  category: "project";
  status: ProjectStatus;
  phase: string;
  health: Health;
  nextDeadline?: string;
  client?: string;
  location?: string;
}

export type AgentState =
  | "idle"
  | "thinking"
  | "researching"
  | "waiting"
  | "executing"
  | "blocked"
  | "completed"
  | "attention";

export interface Agent extends EntityBase {
  category: "agent";
  role: string;
  state: AgentState;
  activity?: string;
  orchestrator?: boolean;
}

export type TaskStatus = "todo" | "in-progress" | "blocked" | "review" | "done";
export type Priority = "low" | "medium" | "high" | "critical";

export interface Task extends EntityBase {
  category: "task";
  status: TaskStatus;
  priority: Priority;
  due?: string;
  projectId?: string;
}

export interface Person extends EntityBase {
  category: "person";
  role: string;
  org?: string;
  discipline?: string;
  email?: string;
}

export interface Communication extends EntityBase {
  category: "communication";
  channel: "email" | "message";
  from: string;
  date: string;
  needsReply?: boolean;
  repliedAt?: string;
  projectId?: string;
}

export type EventKind = "meeting" | "deadline" | "milestone" | "inspection";

export interface CalendarEvent extends EntityBase {
  category: "event";
  kind: EventKind;
  start: string;
  end?: string;
  projectId?: string;
}

export type DocType =
  | "drawing"
  | "spec"
  | "contract"
  | "permit"
  | "report"
  | "rfi"
  | "submittal";
export type DocStatus = "draft" | "in-review" | "issued" | "superseded";

export interface DocumentEntity extends EntityBase {
  category: "document";
  docType: DocType;
  status: DocStatus;
  revision?: string;
  updatedAt: string;
  projectId?: string;
}

export type KnowledgeDomain =
  | "building-code"
  | "zoning"
  | "construction"
  | "materials"
  | "process"
  | "precedent";

export interface KnowledgeNode extends EntityBase {
  category: "knowledge";
  domain: KnowledgeDomain;
}

export interface Idea extends EntityBase {
  category: "idea";
  stage: "spark" | "exploring" | "validated" | "archived";
}

export interface Tool extends EntityBase {
  category: "tool";
  kind: "api" | "skill" | "integration" | "compute";
}

export interface Execution extends EntityBase {
  category: "execution";
  agentId: string;
  outcome: "success" | "partial" | "failed" | "running";
  startedAt: string;
  finishedAt?: string;
}

export interface Service extends EntityBase {
  category: "service";
  status: "online" | "degraded" | "offline";
}

export type Entity =
  | Project
  | Agent
  | Task
  | Person
  | Communication
  | CalendarEvent
  | DocumentEntity
  | KnowledgeNode
  | Idea
  | Tool
  | Execution
  | Service;

export interface Relationship {
  id: string;
  source: string;
  target: string;
  type: RelationshipType;
  /** 0..1 — how strongly the two entities are bound (affects graph link distance). */
  weight?: number;
}

export interface Dataset {
  entities: Record<string, Entity>;
  relationships: Relationship[];
  /** Fixed "now" so demo dates stay stable. */
  now: string;
}

// --- graph projection -----------------------------------------------------

export interface GraphNode {
  id: string;
  category: Category;
  label: string;
  entity: Entity;
  /** 0..1 — drives base size and label priority. */
  importance: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: RelationshipType;
  weight: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// --- attention ----------------------------------------------------------

export type Urgency = "watch" | "soon" | "now";

export interface AttentionItem {
  entityId: string;
  /** 0..1 */
  score: number;
  urgency: Urgency;
  reasons: string[];
}

// --- active context ---------------------------------------------------

export interface ActiveContext {
  projectId: string | null;
  label: string;
  related: {
    tasks: number;
    communications: number;
    consultants: number;
    documents: number;
    meetings: number;
    issues: number;
  };
  agentIds: string[];
}

// --- commands --------------------------------------------------------

export type OSView = "graph" | "timeline" | "attention" | "agents";

export type CommandResult =
  | { kind: "focus-project"; projectId: string; note: string }
  | { kind: "select"; entityId: string; note: string }
  | { kind: "set-view"; view: OSView; note: string }
  | { kind: "filter"; categories: Category[]; note: string }
  | { kind: "attention-today"; note: string }
  | { kind: "search"; query: string; note: string }
  | { kind: "ask-agent"; agentId: string; prompt: string; note: string }
  | { kind: "clear"; note: string }
  | { kind: "reply"; note: string };
