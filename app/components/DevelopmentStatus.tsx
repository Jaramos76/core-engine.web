const columns: {
  key: "foundation" | "dev" | "planned";
  title: string;
  description: string;
  items: string[];
}[] = [
  {
    key: "foundation",
    title: "Foundation",
    description: "Built and currently in use.",
    items: [
      "CoreRuntime",
      "Tool execution",
      "Capability registration",
      "Memory subsystem",
      "EventBus",
    ],
  },
  {
    key: "dev",
    title: "In Development",
    description: "Actively being implemented and tested.",
    items: [
      "Skills",
      "Agent runtime",
      "Execution history",
      "Diagnostics",
      "Security model",
    ],
  },
  {
    key: "planned",
    title: "Planned",
    description: "Designed, not yet built.",
    items: [
      "Health monitoring",
      "Maintenance / self-repair",
      "Lab / research playground",
      "Public SDKs",
    ],
  },
];

export default function DevelopmentStatus() {
  return (
    <section id="status">
      <div className="container">
        <div className="eyebrow">Where things stand</div>
        <h2 className="section-heading">Development Status</h2>
        <p className="section-intro">
          Core Engine is under active development. This page reflects the
          real state of the system — nothing here is described as
          production-ready unless it is.
        </p>
        <div className="status-grid">
          {columns.map((col) => (
            <div key={col.key} className="status-column">
              <div className="status-column-header">
                <span className={`status-dot status-${col.key}`} />
                <h3>{col.title}</h3>
              </div>
              <p className="status-column-desc">{col.description}</p>
              <ul className="status-item-list">
                {col.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
