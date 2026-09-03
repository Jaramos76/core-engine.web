import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getKnowledge } from "@/lib/repos/entities";
import { WorkShell } from "../../_work/WorkShell";
import "../../_work/work.css";

export const metadata: Metadata = { title: "Knowledge · Core Engine", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function KnowledgeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const note = await getKnowledge(id);
  if (!note) notFound();

  return (
    <WorkShell active="knowledge">
      <div className="wk-detail-head">
        <Link href="/dashboard/knowledge" className="wk-back">
          ← Knowledge
        </Link>
        <h1 className="wk-h1" style={{ marginTop: 10 }}>
          {note.title}
        </h1>
        <div className="wk-fields">
          {note.kind && (
            <div className="wk-field">
              <span>Kind</span>
              <div>{note.kind}</div>
            </div>
          )}
          {note.codeName && (
            <div className="wk-field">
              <span>Code</span>
              <div>{note.codeName}</div>
            </div>
          )}
          {note.edition && (
            <div className="wk-field">
              <span>Edition</span>
              <div>{note.edition}</div>
            </div>
          )}
          {note.jurisdiction && (
            <div className="wk-field">
              <span>Jurisdiction</span>
              <div>{note.jurisdiction}</div>
            </div>
          )}
          {note.effectiveDate && (
            <div className="wk-field">
              <span>Effective</span>
              <div>{note.effectiveDate}</div>
            </div>
          )}
          {note.status && (
            <div className="wk-field">
              <span>Status</span>
              <div>{note.status}</div>
            </div>
          )}
        </div>
        {note.projects.length > 0 && (
          <div className="wk-row-sub" style={{ marginTop: 12 }}>
            Referenced by:
            {note.projects.map((p) => (
              <Link
                key={p.id}
                href={`/dashboard/projects/${p.number}?tab=knowledge`}
                className="wk-pill"
                style={{ textDecoration: "none" }}
              >
                {p.number} {p.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      {note.sourceUrl && (
        <p className="wk-row-sub" style={{ marginBottom: 14 }}>
          Source: <span>{note.sourceUrl}</span>
        </p>
      )}

      {note.bodyMarkdown ? (
        <div className="wk-md">{note.bodyMarkdown}</div>
      ) : (
        <div className="wk-empty">No body content migrated for this note.</div>
      )}

      <div className="wk-provenance">
        source: {note.sourceType ?? "—"} · {note.sourcePath ?? "—"}
        <br />
        imported: {note.importedAt ? new Date(note.importedAt).toISOString() : "—"}
      </div>
    </WorkShell>
  );
}
