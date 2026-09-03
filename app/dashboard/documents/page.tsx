import type { Metadata } from "next";
import Link from "next/link";

import { listDocuments } from "@/lib/repos/entities";
import { WorkShell } from "../_work/WorkShell";
import "../_work/work.css";

export const metadata: Metadata = { title: "Documents · Core Engine", robots: { index: false } };
export const dynamic = "force-dynamic";

function fmtSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default async function DocumentsPage() {
  const docs = await listDocuments();
  const groups = new Map<string, { number: string | null; name: string | null; docs: typeof docs }>();
  for (const d of docs) {
    const key = d.projectId ?? "unassigned";
    const g = groups.get(key) ?? { number: d.projectNumber, name: d.projectName, docs: [] };
    g.docs.push(d);
    groups.set(key, g);
  }

  return (
    <WorkShell active="documents">
      <div className="wk-head">
        <p className="wk-eyebrow">Work</p>
        <h1 className="wk-h1">Documents</h1>
        <p className="wk-sub">
          {docs.length} document records — catalog metadata only. Files are never
          copied into the app or served raw; each row keeps its on-disk path, SHA-256
          and size for provenance.
        </p>
      </div>

      {[...groups.values()].map((g) => (
        <section key={g.number ?? "unassigned"} className="wk-home-section">
          <h2 className="wk-eyebrow">
            {g.number ? (
              <Link
                href={`/dashboard/projects/${g.number}?tab=documents`}
                style={{ color: "inherit", textDecoration: "none" }}
              >
                {g.number} · {g.name}
              </Link>
            ) : (
              "Firm library — not project-specific"
            )}{" "}
            <span className="wk-tab-count">{g.docs.length}</span>
          </h2>
          <div className="wk-list">
            {g.docs.map((d) => (
              <div key={d.id} className="wk-row">
                <div className="wk-row-main">
                  <div className="wk-row-title">{d.title}</div>
                  <div className="wk-row-sub">
                    {d.docType && <span className="wk-pill">{d.docType}</span>}
                    {d.sizeBytes ? <span>{fmtSize(d.sizeBytes)}</span> : null}
                    {d.sha256 && <span title={d.sha256}>sha {d.sha256.slice(0, 10)}</span>}
                    {d.filePath && (
                      <span title={d.filePath}>
                        {d.filePath.split("/").slice(-2).join("/")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </WorkShell>
  );
}
