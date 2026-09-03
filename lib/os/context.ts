// Active Context — the project (and its neighbourhood) the operator is
// currently working within. Agents inherit this unless a command overrides it,
// so the operator does not have to re-state which project they mean.

import { indexGraph, relatedByCategory, type GraphIndex } from "./graph";
import type { ActiveContext, Dataset, GraphData } from "./types";

export function deriveActiveContext(
  dataset: Dataset,
  graph: GraphData,
  focusProjectId: string | null,
  selectedId: string | null,
  index?: GraphIndex,
): ActiveContext {
  const idx = index ?? indexGraph(graph);

  // Resolve which project we are "in": explicit focus wins, else the selected
  // entity's project, else the selected entity if it is itself a project.
  let projectId = focusProjectId;
  if (!projectId && selectedId) {
    const sel = dataset.entities[selectedId];
    if (sel?.category === "project") projectId = sel.id;
    else if (sel && "projectId" in sel && sel.projectId) projectId = sel.projectId;
  }

  if (!projectId || !dataset.entities[projectId]) {
    return {
      projectId: null,
      label: "System overview",
      related: {
        tasks: 0,
        communications: 0,
        consultants: 0,
        documents: 0,
        meetings: 0,
        issues: 0,
      },
      agentIds: [],
    };
  }

  const project = dataset.entities[projectId];
  const related = relatedByCategory(idx, dataset, projectId);

  const tasks = related.task ?? [];
  const comms = related.communication ?? [];
  const people = related.person ?? [];
  const documents = related.document ?? [];
  const events = related.event ?? [];
  const agents = (related.agent ?? []).map((a) => a.id);

  const issues =
    tasks.filter((t) => t.category === "task" && t.status === "blocked").length +
    comms.filter(
      (c) => c.category === "communication" && c.needsReply && !c.repliedAt,
    ).length;

  return {
    projectId,
    label: project.name,
    related: {
      tasks: tasks.length,
      communications: comms.length,
      consultants: people.filter((p) => p.category === "person").length,
      documents: documents.length,
      meetings: events.filter(
        (e) => e.category === "event" && e.kind === "meeting",
      ).length,
      issues,
    },
    agentIds: agents,
  };
}
