const principles = [
  {
    name: "Provider neutrality",
    description:
      "Core Engine does not depend on any single model or vendor. Providers are interchangeable components underneath the runtime, not the foundation itself.",
  },
  {
    name: "Modular architecture",
    description:
      "Subsystems — tools, memory, agents, skills — are independent units with defined boundaries, developed and reasoned about in isolation.",
  },
  {
    name: "Observable execution",
    description:
      "Every action the runtime takes is inspectable. Execution history and diagnostics are part of the system, not an afterthought.",
  },
  {
    name: "Recoverability",
    description:
      "Failures are expected. The runtime is designed to detect, diagnose, and recover from faults rather than assume they won't happen.",
  },
  {
    name: "Explicit subsystem boundaries",
    description:
      "Subsystems communicate through defined interfaces and the event bus, not by reaching into each other's internals.",
  },
  {
    name: "Security as architecture",
    description:
      "Security is a structural property of the runtime — access, isolation, and permissioning are designed in, not layered on afterward.",
  },
  {
    name: "Core over application",
    description:
      "External applications consume Core Engine; they do not define it. The runtime's behavior stays stable and portable across the products built on it.",
  },
];

export default function Principles() {
  return (
    <section id="principles">
      <div className="container">
        <div className="eyebrow">Design principles</div>
        <h2 className="section-heading">Principles</h2>
        <p className="section-intro">
          These principles guide every decision in how Core Engine is built,
          from subsystem boundaries to how failures are handled.
        </p>
        <div className="principles-grid">
          {principles.map((p, i) => (
            <div key={p.name} className="principle-card">
              <div className="principle-index mono">
                {String(i + 1).padStart(2, "0")}
              </div>
              <h3 className="principle-name">{p.name}</h3>
              <p className="principle-desc">{p.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
