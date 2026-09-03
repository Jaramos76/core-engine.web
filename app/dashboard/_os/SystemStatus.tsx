"use client";

import { useMemo } from "react";

import { AGENT_STATE_META } from "@/lib/os/visual";
import { rankedAttention } from "@/lib/os/attention";
import type { Agent, Service } from "@/lib/os/types";
import { useOS } from "./OSProvider";

export function SystemStatus() {
  const os = useOS();

  const stats = useMemo(() => {
    const entities = Object.values(os.dataset.entities);
    const agents = entities.filter((e): e is Agent => e.category === "agent");
    const active = agents.filter((a) => AGENT_STATE_META[a.state].active).length;
    const running = entities.filter(
      (e) => e.category === "execution" && e.outcome === "running",
    ).length;
    const openTasks = entities.filter(
      (e) => e.category === "task" && e.status !== "done",
    ).length;
    const services = entities.filter(
      (e): e is Service => e.category === "service",
    );
    const degraded = services.filter((s) => s.status !== "online").length;
    const attention = rankedAttention(os.attention).filter(
      (a) => a.urgency !== "watch",
    ).length;
    return { active, running, openTasks, services: services.length, degraded, attention };
  }, [os.dataset, os.attention]);

  return (
    <div className="og-status">
      <span className="og-status-core">
        <span className="og-status-dot" data-state={stats.degraded ? "degraded" : "online"} />
        Core Engine
        <span className="og-status-word">
          {stats.degraded ? "Degraded" : "Online"}
        </span>
      </span>
      <span className="og-status-metrics">
        <b>{stats.active}</b> agents
        <span className="og-status-sep" />
        <b>{stats.running}</b> jobs
        <span className="og-status-sep" />
        <button
          type="button"
          className="og-status-attn"
          onClick={() => os.toggleAttention(true)}
        >
          <b>{stats.attention}</b> need attention
        </button>
      </span>
    </div>
  );
}
