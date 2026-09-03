import type { Metadata } from "next";
import Link from "next/link";

import { listTasks, taskCounts, type TaskView } from "@/lib/repos/tasks";
import { WorkShell } from "../_work/WorkShell";
import "../_work/work.css";

export const metadata: Metadata = {
  title: "Tasks · Core Engine",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

const FILTERS: { view: TaskView; label: string }[] = [
  { view: "today", label: "Today" },
  { view: "overdue", label: "Overdue" },
  { view: "upcoming", label: "Upcoming" },
  { view: "by-priority", label: "By priority" },
  { view: "all", label: "All open" },
  { view: "completed", label: "Completed" },
];

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view: viewParam } = await searchParams;
  const view = (FILTERS.find((f) => f.view === viewParam)?.view ?? "all") as TaskView;

  const [tasks, counts] = await Promise.all([listTasks({ view }), taskCounts()]);

  return (
    <WorkShell active="tasks">
      <div className="wk-head">
        <p className="wk-eyebrow">Work</p>
        <h1 className="wk-h1">Tasks</h1>
        <p className="wk-sub">
          {counts.open} open, {counts.done} completed. Tasks persist in Core Engine —
          extracted from project notes, emails and meetings during import, and no
          longer tied to Obsidian checkboxes.
        </p>
      </div>

      <div className="wk-taskfilters">
        {FILTERS.map((f) => (
          <Link
            key={f.view}
            href={`/dashboard/tasks?view=${f.view}`}
            data-active={f.view === view}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="wk-list">
        {tasks.length === 0 && <div className="wk-empty">Nothing here.</div>}
        {tasks.map((t) => (
          <div key={t.id} className="wk-row">
            <span className="wk-status" data-s={t.status}>
              {t.status}
            </span>
            <div className="wk-row-main">
              <div className="wk-row-title">{t.title}</div>
              <div className="wk-row-sub">
                {t.projectNumber && (
                  <Link
                    href={`/dashboard/projects/${t.projectNumber}`}
                    className="wk-pill"
                    style={{ textDecoration: "none" }}
                  >
                    {t.projectNumber} {t.projectName}
                  </Link>
                )}
                {t.sourceKind && (
                  <span className="wk-pill">{t.sourceKind.replace(/_/g, " ")}</span>
                )}
                {t.priority && <span>priority: {t.priority}</span>}
              </div>
            </div>
            <div className="wk-row-aside">{t.dueDate ? `due ${t.dueDate}` : ""}</div>
          </div>
        ))}
      </div>
    </WorkShell>
  );
}
