"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { TaskListItem } from "@/lib/repos/tasks";

async function patch(id: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/v1/tasks/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.ok;
}

export function TaskRow({ task, showProject = true }: { task: TaskListItem; showProject?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);

  const act = async (action: string, extra?: Record<string, unknown>) => {
    setBusy(true);
    const ok = await patch(task.id, { action, ...extra });
    setBusy(false);
    if (ok) router.refresh();
  };

  const inReview = task.reviewRequired && task.reviewStatus === "pending";
  const conf = task.extractionConfidence;

  return (
    <div className="wk-row" data-review={inReview || undefined}>
      <span className="wk-status" data-s={task.status}>
        {task.status === "done" ? "done" : inReview ? "review" : task.status}
      </span>
      <div className="wk-row-main">
        {editing ? (
          <form
            className="wk-edit"
            onSubmit={(e) => {
              e.preventDefault();
              setEditing(false);
              act("edit", { title });
            }}
          >
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
            <button type="submit" disabled={busy}>
              Save
            </button>
            <button type="button" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </form>
        ) : (
          <div className="wk-row-title">{task.title}</div>
        )}

        <div className="wk-row-sub">
          {showProject && task.projectNumber && (
            <Link
              href={`/dashboard/projects/${task.projectNumber}`}
              className="wk-pill"
              style={{ textDecoration: "none" }}
            >
              {task.projectNumber} {task.projectName}
            </Link>
          )}
          {task.sourceKind && <span className="wk-pill">{task.sourceKind.replace(/_/g, " ")}</span>}
          {task.sourceEmailSubject &&
            task.sourceEntityType === "communication" &&
            (task.projectNumber && task.sourceEntityId ? (
              <Link
                className="wk-from"
                href={`/dashboard/projects/${task.projectNumber}?tab=emails#email-${task.sourceEntityId}`}
              >
                from email: <em>{task.sourceEmailSubject}</em>
              </Link>
            ) : (
              <span className="wk-from">
                from email: <em>{task.sourceEmailSubject}</em>
              </span>
            ))}
          {task.priority && <span>priority: {task.priority}</span>}
          {task.dueDate && <span>due {task.dueDate}</span>}
          {conf != null && inReview && (
            <span className="wk-conf">confidence {(conf * 100).toFixed(0)}%</span>
          )}
        </div>

        {inReview && !editing && (
          <div className="wk-review-actions">
            <button type="button" disabled={busy} onClick={() => act("approve")}>
              Approve
            </button>
            <button type="button" disabled={busy} onClick={() => setEditing(true)}>
              Edit
            </button>
            <button type="button" disabled={busy} onClick={() => act("complete")}>
              Complete
            </button>
            <button
              type="button"
              disabled={busy}
              className="wk-dismiss"
              onClick={() => act("dismiss")}
            >
              Dismiss
            </button>
          </div>
        )}
        {!inReview && task.status !== "done" && !editing && (
          <div className="wk-review-actions wk-review-actions-quiet">
            <button type="button" disabled={busy} onClick={() => act("complete")}>
              Complete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
