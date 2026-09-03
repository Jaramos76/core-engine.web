"use client";

import { CATEGORY } from "@/lib/os/visual";
import type { Category } from "@/lib/os/types";
import { useOS } from "./OSProvider";

export function ActiveContextBar() {
  const os = useOS();
  const ctx = os.activeContext;

  const pills: { label: string; count: number; category: Category }[] = [
    { label: "Tasks", count: ctx.related.tasks, category: "task" },
    { label: "Emails", count: ctx.related.communications, category: "communication" },
    { label: "Consultants", count: ctx.related.consultants, category: "person" },
    { label: "Documents", count: ctx.related.documents, category: "document" },
    { label: "Meetings", count: ctx.related.meetings, category: "event" },
  ];

  return (
    <div className="og-context-bar">
      <span className="og-context-tag mono">Active context</span>
      <span className="og-context-project">
        {ctx.projectId ? (
          <button type="button" onClick={() => os.select(ctx.projectId!)}>
            {ctx.label}
          </button>
        ) : (
          <span className="og-context-none">{ctx.label}</span>
        )}
      </span>

      {ctx.projectId && (
        <span className="og-context-pills">
          {pills
            .filter((p) => p.count > 0)
            .map((p) => (
              <button
                key={p.label}
                type="button"
                className="og-context-pill"
                onClick={() => os.setFilter([p.category])}
              >
                <span
                  className="og-context-pill-dot"
                  style={{ background: CATEGORY[p.category].color }}
                />
                {p.count} {p.label}
              </button>
            ))}
          {ctx.related.issues > 0 && (
            <button
              type="button"
              className="og-context-pill og-context-pill-issue"
              onClick={() => os.toggleAttention(true)}
            >
              {ctx.related.issues} need action
            </button>
          )}
        </span>
      )}

      {ctx.agentIds.length > 0 && (
        <span className="og-context-agents">
          {ctx.agentIds.length} agent{ctx.agentIds.length > 1 ? "s" : ""} on context
        </span>
      )}

      {(os.state.focusProjectId || os.state.filterCategories) && (
        <button type="button" className="og-context-clear" onClick={() => os.clear()}>
          Clear
        </button>
      )}
    </div>
  );
}
