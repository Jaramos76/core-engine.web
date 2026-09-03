"use client";

import { useMemo } from "react";

import { relatedByCategory } from "@/lib/os/graph";
import { AGENT_STATE_META } from "@/lib/os/visual";
import type { Agent } from "@/lib/os/types";
import { useOS } from "../OSProvider";

export function AgentsView() {
  const os = useOS();

  const agents = useMemo(
    () =>
      Object.values(os.dataset.entities)
        .filter((e): e is Agent => e.category === "agent")
        .sort((a, b) => {
          if (a.orchestrator) return -1;
          if (b.orchestrator) return 1;
          const aa = AGENT_STATE_META[a.state].active ? 0 : 1;
          const bb = AGENT_STATE_META[b.state].active ? 0 : 1;
          return aa - bb;
        }),
    [os.dataset],
  );

  return (
    <div className="og-view og-agents-view">
      <div className="og-view-head">
        <h1>Agents</h1>
        <p>Every worker in Core Engine, its state, and what it is holding.</p>
      </div>

      <div className="og-agents-grid">
        {agents.map((agent) => {
          const meta = AGENT_STATE_META[agent.state];
          const related = relatedByCategory(os.index, os.dataset, agent.id);
          const tasks = related.task ?? [];
          const att = os.attention.get(agent.id);
          return (
            <article
              key={agent.id}
              className="og-agent-card"
              data-orchestrator={agent.orchestrator ? "true" : "false"}
              data-attention={att ? "true" : "false"}
            >
              <header>
                <span className="og-agent-name">{agent.name}</span>
                <span className="og-agent-badge" style={{ color: meta.color }}>
                  {meta.active && (
                    <span className="og-agent-pulse" style={{ background: meta.color }} />
                  )}
                  {meta.label}
                </span>
              </header>
              <p className="og-agent-role">{agent.role}</p>
              <p className="og-agent-activity">{agent.activity}</p>

              <div className="og-agent-meta">
                <span>{tasks.length} task{tasks.length === 1 ? "" : "s"}</span>
                <span>{(related.tool ?? []).length} tools</span>
                <span>{(related.knowledge ?? []).length} sources</span>
              </div>

              <div className="og-agent-actions">
                <button type="button" onClick={() => os.select(agent.id)}>
                  Inspect
                </button>
                <button
                  type="button"
                  onClick={() =>
                    os.runCommand(`ask ${agent.name} to investigate the active context`)
                  }
                >
                  Dispatch
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
