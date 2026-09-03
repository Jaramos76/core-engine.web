import type { Metadata } from "next";
import Link from "next/link";

import { listProjects } from "@/lib/repos/projects";
import { listTasks, taskCounts } from "@/lib/repos/tasks";
import { homeSummary } from "@/lib/repos/entities";
import { WorkShell } from "../_work/WorkShell";
import "../_work/work.css";

export const metadata: Metadata = { title: "Home · Core Engine", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [projects, counts, overdue, review, summary] = await Promise.all([
    listProjects(),
    taskCounts(),
    listTasks({ view: "overdue" }),
    listTasks({ view: "review" }),
    homeSummary(),
  ]);

  const attention = [...projects]
    .filter((p) => p.health === "red" || p.health === "yellow" || p.openTasks > 0)
    .sort((a, b) => {
      const rank = (h: string | null) => (h === "red" ? 0 : h === "yellow" ? 1 : 2);
      return rank(a.health) - rank(b.health) || b.openTasks - a.openTasks;
    })
    .slice(0, 8);

  return (
    <WorkShell active="home">
      <div className="wk-head">
        <p className="wk-eyebrow">Command center</p>
        <h1 className="wk-h1">Home</h1>
        <p className="wk-sub">
          Real data from Core Engine. {summary.projects.total} projects
          ({summary.projects.atRisk} at risk, {summary.projects.blocked} blocked),
          {" "}
          {counts.open} open tasks, {counts.review} awaiting review.
        </p>
      </div>

      <div className="wk-home-tiles">
        <Link href="/dashboard/projects" className="wk-tile">
          <span className="wk-tile-n">{summary.projects.total}</span>
          <span className="wk-tile-l">Projects</span>
        </Link>
        <Link href="/dashboard/tasks?view=overdue" className="wk-tile" data-alert={overdue.length > 0}>
          <span className="wk-tile-n">{overdue.length}</span>
          <span className="wk-tile-l">Overdue tasks</span>
        </Link>
        <Link href="/dashboard/tasks?view=review" className="wk-tile" data-alert={review.length > 0}>
          <span className="wk-tile-n">{review.length}</span>
          <span className="wk-tile-l">Awaiting review</span>
        </Link>
        <Link href="/dashboard/emails" className="wk-tile">
          <span className="wk-tile-n">{projects.reduce((n, p) => n + p.emails, 0)}</span>
          <span className="wk-tile-l">Emails</span>
        </Link>
      </div>

      <section className="wk-home-section">
        <h2 className="wk-eyebrow">Needs attention</h2>
        <div className="wk-proj-grid">
          {attention.map((p) => (
            <Link key={p.id} href={`/dashboard/projects/${p.number}`} className="wk-proj-card">
              <div className="wk-proj-num">{p.number}</div>
              <div className="wk-proj-name">{p.name}</div>
              <div className="wk-proj-meta">
                {p.currentPhase && <span>{p.currentPhase}</span>}
                {p.health && (
                  <span className="wk-health" data-h={p.health}>
                    {p.health}
                  </span>
                )}
                <span>
                  <b>{p.openTasks}</b> open
                </span>
                {p.nextAction && <span title={p.nextAction}>next: {p.nextAction.slice(0, 40)}</span>}
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="wk-home-section">
        <h2 className="wk-eyebrow">Overdue</h2>
        <div className="wk-list">
          {overdue.length === 0 && <div className="wk-empty">Nothing overdue.</div>}
          {overdue.slice(0, 12).map((t) => (
            <div key={t.id} className="wk-row">
              <span className="wk-status" data-s={t.status}>
                {t.status}
              </span>
              <div className="wk-row-main">
                <div className="wk-row-title">{t.title}</div>
                <div className="wk-row-sub">
                  {t.projectNumber && (
                    <Link href={`/dashboard/projects/${t.projectNumber}`} className="wk-pill" style={{ textDecoration: "none" }}>
                      {t.projectNumber}
                    </Link>
                  )}
                  <span>due {t.dueDate}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </WorkShell>
  );
}
