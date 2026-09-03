import type { Metadata } from "next";
import Link from "next/link";

import { listTasks, taskCounts, type TaskView } from "@/lib/repos/tasks";
import { TaskRow } from "../_work/TaskRow";
import { WorkShell } from "../_work/WorkShell";
import "../_work/work.css";

export const metadata: Metadata = {
  title: "Tasks · Core Engine",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

const FILTERS: { view: TaskView; label: string }[] = [
  { view: "review", label: "Pending review" },
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
          {counts.open} open, {counts.review} awaiting review, {counts.done} done.
          Tasks persist in Core Engine — extracted from project notes, emails and
          meetings during import, no longer tied to Obsidian checkboxes. Low-confidence
          extractions are flagged for review, never deleted.
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
            {f.view === "review" && counts.review > 0 && (
              <span className="wk-badge">{counts.review}</span>
            )}
          </Link>
        ))}
      </div>

      {view === "review" && (
        <p className="wk-note">
          These were pulled from email or meeting text with lower confidence. Approve
          to keep, Edit to fix the wording, Complete if already done, or Dismiss if
          it is not a real task. Nothing here was auto-deleted.
        </p>
      )}

      <div className="wk-list">
        {tasks.length === 0 && <div className="wk-empty">Nothing here.</div>}
        {tasks.map((t) => (
          <TaskRow key={t.id} task={t} />
        ))}
      </div>
    </WorkShell>
  );
}
