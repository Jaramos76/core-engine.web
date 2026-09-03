// Force-directed layout for the spatial graph. Pure (no React) — builds a
// settled 3D d3-force simulation from GraphData. All simulation nodes always
// exist; visibility is a render concern, so the layout stays stable as the
// operator filters and focuses.

import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  forceZ,
  type Simulation,
  type SimulationNode,
} from "d3-force-3d";

import { CATEGORY } from "@/lib/os/visual";
import type { GraphData, GraphEdge, GraphNode } from "@/lib/os/types";

export interface SimNode extends SimulationNode, GraphNode {
  radius: number;
}

export interface SimLink extends Omit<GraphEdge, "source" | "target"> {
  source: SimNode | string;
  target: SimNode | string;
}

export interface SimBundle {
  key: GraphData;
  sim: Simulation<SimNode>;
  nodes: SimNode[];
  links: SimLink[];
  byId: Map<string, SimNode>;
}

export function nodeRadius(node: GraphNode): number {
  return CATEGORY[node.category].scale * (0.6 + node.importance * 0.7);
}

/** Deterministic spread so repeated builds settle the same way. */
function seedPosition(i: number, total: number): [number, number, number] {
  const golden = Math.PI * (3 - Math.sqrt(5));
  const y = 1 - (i / Math.max(total - 1, 1)) * 2;
  const r = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = golden * i;
  const spread = 26;
  return [
    Math.cos(theta) * r * spread,
    y * spread,
    Math.sin(theta) * r * spread,
  ];
}

export function buildSimBundle(graph: GraphData): SimBundle {
  const nodes: SimNode[] = graph.nodes.map((n, i) => {
    const [x, y, z] = seedPosition(i, graph.nodes.length);
    return { ...n, radius: nodeRadius(n), x, y, z };
  });
  const byId = new Map(nodes.map((n) => [n.id, n]));

  const links: SimLink[] = graph.edges
    .filter((e) => byId.has(e.source) && byId.has(e.target))
    .map((e) => ({ ...e }));

  const sim = forceSimulation<SimNode>(nodes, 3)
    .force(
      "link",
      forceLink<SimNode, SimLink>(links)
        .id((n: SimNode) => n.id)
        .distance((l: SimLink) => 6 + (1 - l.weight) * 11)
        .strength((l: SimLink) => 0.25 + l.weight * 0.5),
    )
    .force(
      "charge",
      forceManyBody()
        .strength((n: SimNode) => -8 - n.radius * 2.5)
        .distanceMax(50),
    )
    .force("center", forceCenter(0, 0, 0).strength(1))
    .force("x", forceX(0).strength(0.14))
    .force("y", forceY(0).strength(0.14))
    .force("z", forceZ(0).strength(0.14))
    .force(
      "collide",
      forceCollide((n: SimNode) => n.radius + 1.5).strength(0.9),
    )
    .alphaDecay(0.025)
    .velocityDecay(0.45);

  // Pre-settle so the graph opens calm rather than exploding outward.
  sim.alpha(1);
  for (let i = 0; i < 450; i += 1) sim.tick();
  sim.alpha(0.03);

  return { key: graph, sim, nodes, links, byId };
}

export function resolveEndpoint(end: SimNode | string, byId: Map<string, SimNode>): SimNode | undefined {
  return typeof end === "string" ? byId.get(end) : end;
}
