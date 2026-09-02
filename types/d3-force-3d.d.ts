// Minimal ambient types for d3-force-3d (no official @types package).
// Covers only the surface the Agentic OS graph uses.

declare module "d3-force-3d" {
  interface SimulationNode {
    x?: number;
    y?: number;
    z?: number;
    vx?: number;
    vy?: number;
    vz?: number;
    fx?: number | null;
    fy?: number | null;
    fz?: number | null;
    index?: number;
  }

  interface SimulationLink<N> {
    source: string | number | N;
    target: string | number | N;
  }

  interface Simulation<N extends SimulationNode> {
    nodes(): N[];
    nodes(nodes: N[]): this;
    alpha(): number;
    alpha(alpha: number): this;
    alphaTarget(target: number): this;
    alphaDecay(decay: number): this;
    alphaMin(min: number): this;
    velocityDecay(decay: number): this;
    force(name: string): unknown;
    force(name: string, force: unknown | null): this;
    tick(iterations?: number): this;
    stop(): this;
    restart(): this;
    on(type: string, listener: (() => void) | null): this;
  }

  export function forceSimulation<N extends SimulationNode>(
    nodes?: N[],
    numDimensions?: number,
  ): Simulation<N>;

  // The force factories are fluent; typing each chained setter precisely adds
  // no safety here, so they return `any`.
  export function forceManyBody(): any;
  export function forceLink<N = unknown, L = unknown>(links?: L[]): any;
  export function forceCenter(x?: number, y?: number, z?: number): any;
  export function forceCollide(
    radius?: number | ((n: any) => number),
  ): any;
  export function forceX(x?: number): any;
  export function forceY(y?: number): any;
  export function forceZ(z?: number): any;
}
