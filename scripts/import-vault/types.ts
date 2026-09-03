// Shared shapes for the Vault importer.

export type Ref = { type: string; key: string };

export interface LinkStage {
  from: Ref;
  to: Ref;
  relation: string;
  origin: string;
  confidence?: number;
}

/** A link whose target is a wikilink title we resolve after all entities exist. */
export interface PendingLink {
  from: Ref;
  toTitle: string;
  relation: string;
  origin: string;
}

export interface TaskStage {
  title: string;
  status: string;
  priority: string | null;
  dueDate: string | null;
  projectKey: string | null;
  sourceKind: string;
  source: Ref | null;
  sourceType: string;
  sourcePath: string;
  sourceLine: number;
  extractionConfidence: number | null;
  reviewRequired: boolean;
}

export interface SkippedTask {
  text: string;
  reason: string;
  source: string;
}

export interface Report {
  scope: string;
  vaultPath: string;
  filesScanned: number;
  detected: Record<string, number>;
  imported: Record<string, number>;
  relationships: number;
  reviewRequiredTasks: number;
  tasksSkipped: SkippedTask[];
  unresolvedProjectAssociations: string[];
  warnings: string[];
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
  ideas: Map<string, Record<string, unknown>>;
  documents: Map<string, Record<string, unknown>>;
  tasks: TaskStage[];
  taskKeys: Set<string>; // project::normTitle — for de-duping quoted chains
  links: LinkStage[];
  pendingLinks: PendingLink[];
  tags: Set<string>;
  /** normalized title / key → ref, for wikilink resolution */
  titleIndex: Map<string, Ref>;
  report: Report;
}
