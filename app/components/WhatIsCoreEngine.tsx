const notList = [
  "a chatbot",
  "one AI model",
  "one provider",
  "one frontend",
];

const isList = [
  "Tools",
  "Capabilities",
  "Memory",
  "Agents",
  "Skills",
  "Events",
  "Diagnostics",
  "Health",
  "Self-repair",
  "Security",
  "Extensibility",
];

export default function WhatIsCoreEngine() {
  return (
    <section id="what-is">
      <div className="container">
        <div className="eyebrow">What it is</div>
        <h2 className="section-heading">What is Core Engine</h2>
        <p className="section-intro">
          Most AI products are built as a thin layer over a single model or
          provider. That works until the product needs memory, tool use,
          multi-step agents, observability, or the ability to swap providers
          without a rewrite. Core Engine exists to be the layer underneath
          that — a runtime that applications consume rather than reimplement.
        </p>
        <div className="what-is-grid">
          <div className="what-is-card">
            <h3>Core Engine is not</h3>
            <ul className="tag-list">
              {notList.map((item) => (
                <li key={item} className="tag tag-not">
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="what-is-card">
            <h3>Core Engine is the foundation for</h3>
            <ul className="tag-list">
              {isList.map((item) => (
                <li key={item} className="tag tag-is">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
