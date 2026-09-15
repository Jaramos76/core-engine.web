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
  if (!res.ok) { const body = await res.json().catch(() => ({})); throw new Error(body.error || 'Could not save task.'); }
  return true;
}

export function TaskRow({ task, showProject = true, onUpdated }: { task: TaskListItem; showProject?: boolean; onUpdated?: () => void | Promise<void> }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [dueDate, setDueDate] = useState(task.dueDate?.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? task.dueDate?.replace(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, (_,m,d,y) => `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`) ?? '');
  const [priority,setPriority] = useState(task.priority ?? '');
  const [error,setError] = useState('');
  const [saved,setSaved] = useState(false);

  const act = async (action: string, extra?: Record<string, unknown>) => {
    setBusy(true);
    setError(''); setSaved(false);
    try { await patch(task.id, { action, ...extra }); setEditing(false); setSaved(true); await onUpdated?.(); router.refresh(); }
    catch(e) { setError(e instanceof Error ? e.message : 'Could not save task.'); }
    finally { setBusy(false); }
  };

  const inReview = task.reviewRequired && task.reviewStatus === "pending";
  const conf = task.extractionConfidence;

  return (
    <div className="wk-row" data-review={inReview || undefined}>
      <span className="wk-status" data-s={task.status}>
        {task.status === "done" ? "done" : inReview ? "review" : task.status}
      </span>
      <div className="wk-row-main">
        {error && <p role="alert">{error}</p>}
        {saved && <p role="status">Saved.</p>}
        {editing ? (
          <form
            className="wk-edit"
            onSubmit={(e) => {
              e.preventDefault();
              act("edit", { title, dueDate:dueDate || null, priority:priority || null });
            }}
          >
            <input
              aria-label="Task title" required maxLength={500}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
            <label>Due date<input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)}/></label>
            <label>Priority<select aria-label="Task priority" value={priority} onChange={e=>setPriority(e.target.value)}><option value="">None</option>{[...new Set(['low','normal','medium','high','critical',...(task.priority?[task.priority]:[])])].map(p=><option key={p} value={p}>{p}</option>)}</select></label>
            <button type="submit" disabled={busy||!title.trim()}>
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
        {!inReview && !editing && (
          <div className="wk-review-actions wk-review-actions-quiet">
            <button type="button" disabled={busy} onClick={() => setEditing(true)}>Edit</button>
            <button type="button" disabled={busy} onClick={() => act(task.status === "done" ? "reopen" : "complete")}>
              {task.status === "done" ? "Reopen" : "Complete"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
