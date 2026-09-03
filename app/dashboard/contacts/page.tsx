import type { Metadata } from "next";
import Link from "next/link";

import { listContacts } from "@/lib/repos/entities";
import { WorkShell } from "../_work/WorkShell";
import "../_work/work.css";

export const metadata: Metadata = { title: "Contacts · Core Engine", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const contacts = await listContacts();
  const consultants = contacts.filter((c) => c.isConsultant);
  const others = contacts.filter((c) => !c.isConsultant);

  return (
    <WorkShell active="contacts">
      <div className="wk-head">
        <p className="wk-eyebrow">Work</p>
        <h1 className="wk-h1">Contacts</h1>
        <p className="wk-sub">
          {contacts.length} people — {consultants.length} consultants of record plus{" "}
          {others.length} correspondents derived from project email. Merged by email
          address, then by normalized name, during import.
        </p>
      </div>

      <Section title="Consultants" rows={consultants} />
      <Section title="Correspondents" rows={others} />
    </WorkShell>
  );
}

function Section({
  title,
  rows,
}: {
  title: string;
  rows: Awaited<ReturnType<typeof listContacts>>;
}) {
  if (rows.length === 0) return null;
  return (
    <section className="wk-home-section">
      <h2 className="wk-eyebrow">
        {title} <span className="wk-tab-count">{rows.length}</span>
      </h2>
      <div className="wk-list">
        {rows.map((c) => (
          <div key={c.id} className="wk-row">
            <div className="wk-row-main">
              <div className="wk-row-title">{c.name}</div>
              <div className="wk-row-sub">
                {c.company && <span>{c.company}</span>}
                {c.trade && <span className="wk-pill">{c.trade}</span>}
                {c.role && <span>{c.role}</span>}
                {c.email && <span>{c.email}</span>}
                {(c.phone || c.cell || c.office) && <span>{c.phone ?? c.cell ?? c.office}</span>}
                {c.projects.map((p) => (
                  <Link
                    key={p.id}
                    href={`/dashboard/projects/${p.number}?tab=team`}
                    className="wk-pill"
                    style={{ textDecoration: "none" }}
                  >
                    {p.number}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
