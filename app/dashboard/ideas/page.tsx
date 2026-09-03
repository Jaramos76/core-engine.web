import type { Metadata } from "next";

import { listIdeas } from "@/lib/repos/entities";
import { WorkShell } from "../_work/WorkShell";
import "../_work/work.css";

export const metadata: Metadata = { title: "Ideas · Core Engine", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function IdeasPage() {
  const ideas = await listIdeas();
  const byMaturity = new Map<string, typeof ideas>();
  for (const i of ideas) {
    const k = i.maturity ?? "captured";
    byMaturity.set(k, [...(byMaturity.get(k) ?? []), i]);
  }

  return (
    <WorkShell active="ideas">
      <div className="wk-head">
        <p className="wk-eyebrow">Work</p>
        <h1 className="wk-h1">Ideas</h1>
        <p className="wk-sub">
          {ideas.length} ideas migrated from the Vault, grouped by maturity. Relationship
          counts come from the first-class links table — each idea keeps its verbatim
          relation fields to projects, knowledge and other ideas.
        </p>
      </div>

      {[...byMaturity.entries()].map(([maturity, items]) => (
        <section key={maturity} className="wk-home-section">
          <h2 className="wk-eyebrow">
            {maturity} <span className="wk-tab-count">{items.length}</span>
          </h2>
          <div className="wk-list">
            {items.map((i) => (
              <div key={i.id} className="wk-row">
                <div className="wk-row-main">
                  <div className="wk-row-title">{i.title}</div>
                  <div className="wk-row-sub">
                    {i.ideaKey && <span className="wk-pill">{i.ideaKey}</span>}
                    {i.status && <span>{i.status}</span>}
                    {i.priority && <span>priority: {i.priority}</span>}
                    {i.confidence && <span>confidence: {i.confidence}</span>}
                    <span>{i.relationCount} links</span>
                  </div>
                  {i.bodyMarkdown && (
                    <div className="wk-row-sub" style={{ marginTop: 6 }}>
                      {i.bodyMarkdown.slice(0, 220).replace(/\s+/g, " ").trim()}
                      {i.bodyMarkdown.length > 220 ? "…" : ""}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </WorkShell>
  );
}
