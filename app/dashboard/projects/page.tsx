import type { Metadata } from "next";
import Link from "next/link";

import { listProjects } from "@/lib/repos/projects";
import { WorkShell } from "../_work/WorkShell";
import "../_work/work.css";

export const metadata: Metadata = {
  title: "Projects · Core Engine",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const projects = await listProjects();

  return (
    <WorkShell active="projects">
      <div className="wk-head">
        <div className="wk-head-row">
          <div>
            <p className="wk-eyebrow">Work</p>
            <h1 className="wk-h1">Projects</h1>
          </div>
          <Link href="/dashboard/projects/new" className="wk-btn-primary wk-btn-sm">
            + New project
          </Link>
        </div>
        <p className="wk-sub">
          {projects.length
            ? `${projects.length} project${projects.length === 1 ? "" : "s"}. Real data — tasks, emails and meetings persist in Core Engine. New projects are created here directly, no Vault note required.`
            : "No projects yet. Create one, or run the Vault importer."}
        </p>
      </div>

      {projects.length === 0 ? (
        <div className="wk-empty">
          Nothing here yet.{" "}
          <Link href="/dashboard/projects/new">Create the first project →</Link>
        </div>
      ) : (
        <div className="wk-proj-grid">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/dashboard/projects/${p.number}`}
              className="wk-proj-card"
            >
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
                  <b>{p.openTasks}</b> open task{p.openTasks === 1 ? "" : "s"}
                </span>
                <span>
                  <b>{p.emails}</b> email{p.emails === 1 ? "" : "s"}
                </span>
                {p.meetings > 0 && (
                  <span>
                    <b>{p.meetings}</b> meeting{p.meetings === 1 ? "" : "s"}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </WorkShell>
  );
}
