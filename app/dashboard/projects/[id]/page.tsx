import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getProjectBundle } from "@/lib/repos/projects";
import { ProjectTabs, type TabDef } from "../../_work/ProjectTabs";
import { WorkShell } from "../../_work/WorkShell";
import "../../_work/work.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const bundle = await getProjectBundle(decodeURIComponent(id));
  return {
    title: bundle ? `${bundle.project.name} · Core Engine` : "Project · Core Engine",
    robots: { index: false },
  };
}

function fmtDate(d: Date | string | null): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return String(d);
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function Field({ label, value, prio }: { label: string; value: React.ReactNode; prio?: string | null }) {
  if (value == null || value === "") return null;
  return (
    <div className="wk-field">
      <span>{label}</span>
      <div data-prio={prio ?? undefined}>{value}</div>
    </div>
  );
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bundle = await getProjectBundle(decodeURIComponent(id));
  if (!bundle) notFound();

  const { project: p, tasks, meetings, communications, knowledge, documents, team, activity } = bundle;
  const openTasks = tasks.filter((t) => t.status !== "done");

  const tabs: TabDef[] = [
    { id: "overview", label: "Overview" },
    { id: "tasks", label: "Tasks", count: openTasks.length },
    { id: "emails", label: "Emails", count: communications.length },
    { id: "meetings", label: "Meetings", count: meetings.length },
    { id: "team", label: "Team", count: team.length },
    { id: "knowledge", label: "Knowledge", count: knowledge.length },
    { id: "documents", label: "Documents", count: documents.length },
    { id: "activity", label: "Activity", count: activity.length },
  ];

  return (
    <WorkShell active="projects">
      <div className="wk-detail-head">
        <Link href="/dashboard/projects" className="wk-back">
          ← All projects
        </Link>
        <p className="wk-eyebrow" style={{ marginTop: 12 }}>
          {p.number}
        </p>
        <h1 className="wk-h1">{p.name}</h1>

        <div className="wk-fields">
          <Field label="Status" value={p.status} />
          <Field label="Phase" value={p.currentPhase} />
          <Field
            label="Health"
            value={
              p.health ? (
                <span className="wk-health" data-h={p.health}>
                  {p.health}
                </span>
              ) : null
            }
          />
          <Field label="Priority" value={p.priority} prio={p.priority} />
          <Field
            label="Address"
            value={
              [
                p.addressLine,
                p.addressLine?.includes(p.city ?? "\0") ? null : p.city,
                p.state,
              ]
                .filter(Boolean)
                .join(", ") || null
            }
          />
          <Field label="Client" value={p.client} />
          <Field label="Architect" value={p.architect} />
          <Field label="AHJ" value={p.ahj} />
          <Field label="Permit" value={p.permitStatus} />
          <Field label="Disciplines" value={(p.disciplines ?? []).join(", ") || null} />
          <Field label="Target date" value={p.targetDate} />
          <Field label="Next action" value={p.nextAction} />
        </div>
      </div>

      <ProjectTabs tabs={tabs}>
        {/* overview */}
        <div>
          <div className="wk-fields" style={{ background: "transparent" }}>
            <Field label="Open tasks" value={String(openTasks.length)} />
            <Field label="Emails" value={String(communications.length)} />
            <Field label="Meetings" value={String(meetings.length)} />
            <Field label="Team" value={String(team.length)} />
            <Field label="Knowledge notes" value={String(knowledge.length)} />
            <Field label="Documents" value={String(documents.length)} />
          </div>
          {p.scopeOfWork && (
            <>
              <p className="wk-eyebrow" style={{ marginTop: 20 }}>
                Scope of work
              </p>
              <p className="wk-md">{p.scopeOfWork}</p>
            </>
          )}
        </div>

        {/* tasks */}
        <div className="wk-list">
          {tasks.length === 0 && <div className="wk-empty">No tasks.</div>}
          {tasks.map((t) => (
            <div key={t.id} className="wk-row">
              <span className="wk-status" data-s={t.status}>
                {t.status}
              </span>
              <div className="wk-row-main">
                <div className="wk-row-title">{t.title}</div>
                <div className="wk-row-sub">
                  {t.sourceKind && <span className="wk-pill">{t.sourceKind.replace(/_/g, " ")}</span>}
                  {t.priority && <span>priority: {t.priority}</span>}
                  {t.dueDate && <span>due {t.dueDate}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* emails */}
        <div className="wk-list">
          {communications.length === 0 && <div className="wk-empty">No emails.</div>}
          {communications.map((c) => (
            <div key={c.id} className="wk-row">
              <div className="wk-row-main">
                <div className="wk-row-title">{c.subject}</div>
                <div className="wk-row-sub">
                  <span>{c.fromName ?? c.fromEmail}</span>
                  {c.category && <span className="wk-pill">{c.category}</span>}
                  {c.priority && <span>priority: {c.priority}</span>}
                  {c.actionRequired && <span>action required</span>}
                  <span>{c.status}</span>
                </div>
                {c.bodyText && (
                  <div className="wk-email-body">
                    {c.bodyText.replace(/\n{3,}/g, "\n\n").trim().slice(0, 4000)}
                  </div>
                )}
              </div>
              <div className="wk-row-aside">{fmtDate(c.receivedAt)}</div>
            </div>
          ))}
        </div>

        {/* meetings */}
        <div className="wk-list">
          {meetings.length === 0 && (
            <div className="wk-empty">No meetings recorded for this project.</div>
          )}
          {meetings.map((m) => (
            <div key={m.id} className="wk-row">
              <div className="wk-row-main">
                <div className="wk-row-title">{m.title}</div>
                {m.agenda && <div className="wk-row-sub">{m.agenda}</div>}
              </div>
              <div className="wk-row-aside">{fmtDate(m.startsAt ?? m.date)}</div>
            </div>
          ))}
        </div>

        {/* team */}
        <div className="wk-list">
          {team.length === 0 && <div className="wk-empty">No team members linked.</div>}
          {team.map(({ contact: c, relation }) => (
            <div key={c.id} className="wk-row">
              <div className="wk-row-main">
                <div className="wk-row-title">
                  {c.name}
                  {c.isConsultant && <span className="wk-pill" style={{ marginLeft: 8 }}>consultant</span>}
                </div>
                <div className="wk-row-sub">
                  {c.role && <span>{c.role}</span>}
                  {c.trade && <span>{c.trade}</span>}
                  {c.company && <span>{c.company}</span>}
                  {c.email && <span>{c.email}</span>}
                  {c.phone && <span>{c.phone}</span>}
                  <span className="wk-pill">{relation.replace(/_/g, " ")}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* knowledge */}
        <div className="wk-list">
          {knowledge.length === 0 && (
            <div className="wk-empty">No knowledge notes linked to this project.</div>
          )}
          {knowledge.map((k) => (
            <div key={k.id} className="wk-row">
              <div className="wk-row-main">
                <div className="wk-row-title">{k.title}</div>
                <div className="wk-row-sub">
                  {k.kind && <span className="wk-pill">{k.kind}</span>}
                  {k.jurisdiction && <span>{k.jurisdiction}</span>}
                  {k.edition && <span>{k.edition}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* documents */}
        <div className="wk-list">
          {documents.length === 0 && (
            <div className="wk-empty">
              No documents catalogued. Drawings and permit sets live on disk and are
              indexed here later — never served to the browser.
            </div>
          )}
          {documents.map((d) => (
            <div key={d.id} className="wk-row">
              <div className="wk-row-main">
                <div className="wk-row-title">{d.title}</div>
                <div className="wk-row-sub">
                  {d.docType && <span className="wk-pill">{d.docType}</span>}
                  {d.revision && <span>rev {d.revision}</span>}
                  {d.sizeBytes && <span>{Math.round(d.sizeBytes / 1024)} KB</span>}
                  {d.sha256 && <span>sha {d.sha256.slice(0, 10)}</span>}
                </div>
              </div>
              <div className="wk-row-aside">{fmtDate(d.fileModifiedAt)}</div>
            </div>
          ))}
        </div>

        {/* activity */}
        <div className="wk-list">
          {activity.length === 0 && <div className="wk-empty">No activity yet.</div>}
          {activity.map((a) => (
            <div key={a.id} className="wk-row">
              <div className="wk-row-main">
                <div className="wk-row-title">{a.summary ?? a.verb}</div>
                <div className="wk-row-sub">
                  <span>{a.actor}</span>
                  <span>{a.verb}</span>
                </div>
              </div>
              <div className="wk-row-aside">{fmtDate(a.occurredAt)}</div>
            </div>
          ))}
        </div>
      </ProjectTabs>

      <div className="wk-provenance">
        source: {p.sourceType} · {p.sourcePath}
        <br />
        imported: {fmtDate(p.importedAt)} · this data mirrors the Vault, which remains authoritative
      </div>
    </WorkShell>
  );
}
