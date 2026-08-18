export default function Hero() {
  return (
    <section id="top" className="hero">
      <div className="container">
        <div className="eyebrow">Core Engine</div>
        <h1 className="hero-title">
          An operating foundation for intelligent systems.
        </h1>
        <p className="hero-sub">
          Core Engine is a provider-neutral runtime for tools, memory,
          agents, skills, diagnostics, and autonomous system capabilities —
          built so intelligent applications run on a stable foundation
          instead of being locked to a single model or provider.
        </p>
        <div className="hero-actions">
          <a href="#architecture" className="btn btn-primary">
            Explore Architecture
          </a>
          <a href="#status" className="btn btn-secondary">
            Development Status
          </a>
        </div>
      </div>
    </section>
  );
}
