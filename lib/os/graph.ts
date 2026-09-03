// Projects the normalized dataset into a renderable graph and provides the
// neighbourhood / subgraph queries the workspace navigates by.

import type {
  Category,
  Dataset,
  Entity,
  GraphData,
  GraphEdge,
  GraphNode,
} from "./types";

function importanceOf(entity: Entity, degree: number): number {
  const base: Record<Category, number> = {
    project: 0.9,
    agent: 0.7,
    person: 0.5,
    document: 0.4,
    task: 0.4,
    communication: 0.35,
    event: 0.35,
    knowledge: 0.4,
    idea: 0.35,
    tool: 0.3,
    execution: 0.25,
    service: 0.3,
  };
  if (entity.category === "agent" && "orchestrator" in entity && entity.orchestrator) {
    return 1;
  }
  const degreeBoost = Math.min(0.35, degree * 0.03);
  return Math.min(1, base[entity.category] + degreeBoost);
}

export function buildGraph(dataset: Dataset): GraphData {
  const degree = new Map<string, number>();
  for (const r of dataset.relationships) {
    degree.set(r.source, (degree.get(r.source) ?? 0) + 1);
    degree.set(r.target, (degree.get(r.target) ?? 0) + 1);
  }

  const nodes: GraphNode[] = Object.values(dataset.entities).map((entity) => ({
    id: entity.id,
    category: entity.category,
    label: entity.name,
    entity,
    importance: importanceOf(entity, degree.get(entity.id) ?? 0),
  }));

  const edges: GraphEdge[] = dataset.relationships.map((r) => ({
    id: r.id,
    source: r.source,
    target: r.target,
    type: r.type,
    weight: r.weight ?? 0.5,
  }));

  return { nodes, edges };
}

export interface GraphIndex {
  nodeById: Map<string, GraphNode>;
  adjacency: Map<string, Set<string>>;
  edgesByNode: Map<string, GraphEdge[]>;
}

export function indexGraph(graph: GraphData): GraphIndex {
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  const adjacency = new Map<string, Set<string>>();
  const edgesByNode = new Map<string, GraphEdge[]>();

  for (const node of graph.nodes) {
    adjacency.set(node.id, new Set());
    edgesByNode.set(node.id, []);
  }
  for (const edge of graph.edges) {
    adjacency.get(edge.source)?.add(edge.target);
    adjacency.get(edge.target)?.add(edge.source);
    edgesByNode.get(edge.source)?.push(edge);
    edgesByNode.get(edge.target)?.push(edge);
  }

  return { nodeById, adjacency, edgesByNode };
}

export function neighbors(index: GraphIndex, id: string): string[] {
  return [...(index.adjacency.get(id) ?? [])];
}

/** Node ids within `depth` hops of `rootId` (inclusive of root). */
export function subgraphIds(
  index: GraphIndex,
  rootId: string,
  depth = 1,
): Set<string> {
  const seen = new Set<string>([rootId]);
  let frontier = [rootId];
  for (let d = 0; d < depth; d += 1) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const nb of index.adjacency.get(id) ?? []) {
        if (!seen.has(nb)) {
          seen.add(nb);
          next.push(nb);
        }
      }
    }
    frontier = next;
  }
  return seen;
}

/** Entities related to `id`, grouped by category. */
export function relatedByCategory(
  index: GraphIndex,
  dataset: Dataset,
  id: string,
): Partial<Record<Category, Entity[]>> {
  const out: Partial<Record<Category, Entity[]>> = {};
  for (const nb of index.adjacency.get(id) ?? []) {
    const entity = dataset.entities[nb];
    if (!entity) continue;
    (out[entity.category] ??= []).push(entity);
  }
  return out;
}
