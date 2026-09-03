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
        <p className="wk-eyebrow">Work</p>
        <h1 className="wk-h1">Projects</h1>
        <p className="wk-sub">
          {projects.length
            ? `${projects.length} project${projects.length === 1 ? "" : "s"} imported from the Vault. Real data — tasks, emails and meetings persist in Core Engine.`
            : "No projects imported yet. Run the Vault importer."}
        </p>
      </div>

      {projects.length === 0 ? (
        <div className="wk-empty">
          Nothing here yet. Import a project with{" "}
          <code>npm run import:vault -- --project &quot;25-14&quot; --apply</code>.
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
