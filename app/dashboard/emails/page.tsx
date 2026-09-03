import type { Metadata } from "next";
import Link from "next/link";

import { listCommunications } from "@/lib/repos/entities";
import { WorkShell } from "../_work/WorkShell";
import "../_work/work.css";

export const metadata: Metadata = { title: "Emails · Core Engine", robots: { index: false } };
export const dynamic = "force-dynamic";

function fmtDate(d: Date | null): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default async function EmailsPage({
  searchParams,
}: {
  searchParams: Promise<{ needsReply?: string }>;
}) {
  const { needsReply } = await searchParams;
  const onlyReply = needsReply === "1";
  const emails = await listCommunications({ needsReply: onlyReply });
  const replyCount = emails.filter((e) => e.actionRequired).length;

  return (
    <WorkShell active="emails">
      <div className="wk-head">
        <p className="wk-eyebrow">Work</p>
        <h1 className="wk-h1">Emails</h1>
        <p className="wk-sub">
          {emails.length} project emails migrated from the Vault email archive,
          associated to projects by folder then frontmatter. {replyCount} flagged as
          action-required.
        </p>
      </div>

      <div className="wk-taskfilters">
        <Link href="/dashboard/emails" data-active={!onlyReply}>
          All
        </Link>
        <Link href="/dashboard/emails?needsReply=1" data-active={onlyReply}>
          Action required
        </Link>
      </div>

      <div className="wk-list">
        {emails.length === 0 && <div className="wk-empty">No emails.</div>}
        {emails.map((e) => (
          <div key={e.id} className="wk-row" data-review={e.actionRequired ? "" : undefined}>
            <div className="wk-row-main">
              <div className="wk-row-title">{e.subject ?? "(no subject)"}</div>
              <div className="wk-row-sub">
                {e.fromName || e.fromEmail ? (
                  <span>{e.fromName ?? e.fromEmail}</span>
                ) : null}
                {e.receivedAt && <span>{fmtDate(e.receivedAt)}</span>}
                {e.category && <span className="wk-pill">{e.category}</span>}
                {e.priority && <span>priority: {e.priority}</span>}
                {e.actionRequired && <span className="wk-conf">action required</span>}
                {e.projectNumber && (
                  <Link
                    href={`/dashboard/projects/${e.projectNumber}?tab=emails#email-${e.id}`}
                    className="wk-pill"
                    style={{ textDecoration: "none" }}
                  >
                    {e.projectNumber}
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </WorkShell>
  );
}
