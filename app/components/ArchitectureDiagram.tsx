type Status = "foundation" | "dev" | "planned";

interface Node {
  name: string;
  status: Status;
}

const statusLabel: Record<Status, string> = {
  foundation: "Foundation",
  dev: "In Development",
  planned: "Planned",
};

const executionLayer: Node[] = [
  { name: "Tools", status: "foundation" },
  { name: "Capabilities", status: "foundation" },
  { name: "Skills", status: "dev" },
  { name: "Memory", status: "foundation" },
  { name: "EventBus", status: "foundation" },
];

const reliabilityLayer: Node[] = [
  { name: "Execution History", status: "dev" },
  { name: "Diagnostics", status: "dev" },
  { name: "Health", status: "planned" },
  { name: "Maintenance / Self-Repair", status: "planned" },
];

const extendedLayer: Node[] = [
  { name: "Agent Runtime", status: "dev" },
  { name: "Security", status: "dev" },
  { name: "Lab / Research Playground", status: "planned" },
];

function NodeCard({ node }: { node: Node }) {
  return (
    <div className={`arch-node arch-node-${node.status}`}>
      <span className={`status-dot status-${node.status === "dev" ? "dev" : node.status}`} />
      <span className="arch-node-name">{node.name}</span>
    </div>
  );
}

export default function ArchitectureDiagram() {
  return (
    <section id="architecture">
      <div className="container">
        <div className="eyebrow">System design</div>
        <h2 className="section-heading">Architecture</h2>
        <p className="section-intro">
          Core Engine is organized around a central runtime that mediates
          every subsystem. Applications consume Core through defined
          boundaries — they do not reach into subsystems directly, and
          subsystems do not depend on each other outside of the runtime.
        </p>

        <div className="arch-diagram">
          <div className="arch-external">External Applications &amp; Interfaces</div>
          <div className="arch-connector" aria-hidden="true" />

          <div className="arch-core">
            <div className="arch-node arch-node-foundation arch-core-node">
              <span className="status-dot status-foundation" />
              <span className="arch-node-name">CoreRuntime</span>
            </div>
          </div>
          <div className="arch-connector" aria-hidden="true" />

          <div className="arch-layer">
            <div className="arch-layer-label mono">Execution</div>
            <div className="arch-node-row">
              {executionLayer.map((n) => (
                <NodeCard key={n.name} node={n} />
              ))}
            </div>
          </div>

          <div className="arch-layer">
            <div className="arch-layer-label mono">Observability &amp; Reliability</div>
            <div className="arch-node-row">
              {reliabilityLayer.map((n) => (
                <NodeCard key={n.name} node={n} />
              ))}
            </div>
          </div>

          <div className="arch-layer">
            <div className="arch-layer-label mono">Extended Runtime</div>
            <div className="arch-node-row">
              {extendedLayer.map((n) => (
                <NodeCard key={n.name} node={n} />
              ))}
            </div>
          </div>
        </div>

        <div className="arch-legend">
          <div className="arch-legend-item">
            <span className="status-dot status-foundation" />
            <span>{statusLabel.foundation} — built and in use today</span>
          </div>
          <div className="arch-legend-item">
            <span className="status-dot status-dev" />
            <span>{statusLabel.dev} — actively being implemented</span>
          </div>
          <div className="arch-legend-item">
            <span className="status-dot status-planned" />
            <span>{statusLabel.planned} — designed, not yet built</span>
          </div>
        </div>
      </div>
    </section>
  );
}
