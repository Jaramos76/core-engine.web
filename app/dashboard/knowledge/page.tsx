import type { Metadata } from "next";
import Link from "next/link";

import { listKnowledge } from "@/lib/repos/entities";
import { WorkShell } from "../_work/WorkShell";
import "../_work/work.css";

export const metadata: Metadata = { title: "Knowledge · Core Engine", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function KnowledgePage() {
  const notes = await listKnowledge();
  const byKind = new Map<string, typeof notes>();
  for (const n of notes) {
    const k = n.kind ?? "note";
    byKind.set(k, [...(byKind.get(k) ?? []), n]);
  }

  return (
    <WorkShell active="knowledge">
      <div className="wk-head">
        <p className="wk-eyebrow">Work</p>
        <h1 className="wk-h1">Knowledge</h1>
        <p className="wk-sub">
          {notes.length} database-backed knowledge objects — building codes, standards
          and references — migrated from the Vault with their Markdown bodies and
          project links preserved.
        </p>
      </div>

      {[...byKind.entries()].map(([kind, items]) => (
        <section key={kind} className="wk-home-section">
          <h2 className="wk-eyebrow">{kind}</h2>
          <div className="wk-list">
            {items.map((n) => (
              <Link key={n.id} href={`/dashboard/knowledge/${n.id}`} className="wk-row" style={{ textDecoration: "none" }}>
                <div className="wk-row-main">
                  <div className="wk-row-title">{n.title}</div>
                  <div className="wk-row-sub">
                    {n.jurisdiction && <span>{n.jurisdiction}</span>}
                    {n.edition && <span>{n.edition}</span>}
                    {n.status && <span className="wk-pill">{n.status}</span>}
                    {n.projects.map((p) => (
                      <span key={p.id} className="wk-pill">
                        {p.number}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </WorkShell>
  );
}
