"use client";

import { useCallback, useEffect, useState } from "react";

type RuntimeAgent = {
  id: string;
  name: string;
  title: string;
  role: string;
  description: string;
  orchestrator: boolean;
  state: "ready" | "offline";
  runtime_backed: boolean;
  tool_count: number;
  tools: string[];
  max_turns?: number;
};

type AgentsResponse = {
  source: string;
  runtime_running: boolean;
  count: number;
  agents: RuntimeAgent[];
};

export function AgentsView() {
  const [data, setData] = useState<AgentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const loadAgents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/v1/agents", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = (await response.json()) as AgentsResponse;

      if (payload.source !== "core-engine-runtime") {
        throw new Error("Unexpected agent source");
      }

      setData(payload);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load Core Engine agents",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAgents();
  }, [loadAgents]);

  const agents = data?.agents ?? [];

  return (
    <div className="og-view og-agents-view">
      <div className="og-view-head">
        <div>
          <h1>Agents</h1>
          <p>
            Live agents loaded from the Core Engine runtime.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadAgents()}
          disabled={loading}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: "12px 14px",
            marginBottom: 16,
            border: "1px solid rgba(255,120,120,.35)",
            borderRadius: 10,
          }}
        >
          Runtime unavailable: {error}
        </div>
      )}

      {!error && data && (
        <div
          style={{
            display: "flex",
            gap: 16,
            alignItems: "center",
            marginBottom: 16,
            opacity: 0.8,
            fontSize: 13,
          }}
        >
          <span>
            Runtime: {data.runtime_running ? "running" : "offline"}
          </span>
          <span>{data.count} agents</span>
          <span>Source: Core Engine</span>
        </div>
      )}

      <div className="og-agents-grid">
        {agents.map((agent) => {
          const ready = agent.state === "ready";
          const isExpanded = expanded === agent.id;

          return (
            <article
              key={agent.id}
              className="og-agent-card"
              data-orchestrator={
                agent.orchestrator ? "true" : "false"
              }
            >
              <header>
                <span className="og-agent-name">
                  {agent.name}
                </span>

                <span
                  className="og-agent-badge"
                  style={{
                    color: ready ? "#7ce7b2" : "#a0a0a0",
                  }}
                >
                  {ready && (
                    <span
                      className="og-agent-pulse"
                      style={{ background: "#7ce7b2" }}
                    />
                  )}

                  {ready ? "Ready" : "Offline"}
                </span>
              </header>

              <p className="og-agent-role">
                {agent.role}
              </p>

              <p className="og-agent-activity">
                {agent.orchestrator
                  ? "Operational orchestrator"
                  : agent.runtime_backed
                    ? "Loaded in Lola runtime"
                    : "Not loaded in runtime"}
              </p>

              <div className="og-agent-meta">
                <span>
                  {agent.tool_count} tool
                  {agent.tool_count === 1 ? "" : "s"}
                </span>

                <span>
                  {agent.orchestrator
                    ? "orchestrator"
                    : "specialist"}
                </span>

                {agent.max_turns != null && (
                  <span>
                    {agent.max_turns} max turns
                  </span>
                )}
              </div>

              {isExpanded && (
                <div
                  style={{
                    marginTop: 12,
                    paddingTop: 12,
                    borderTop:
                      "1px solid rgba(255,255,255,.08)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: ".08em",
                      opacity: 0.55,
                      marginBottom: 8,
                    }}
                  >
                    Actual visible tools
                  </div>

                  {agent.tools.length ? (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 6,
                      }}
                    >
                      {agent.tools.map((tool) => (
                        <span
                          key={tool}
                          style={{
                            fontSize: 11,
                            padding: "4px 7px",
                            borderRadius: 6,
                            background:
                              "rgba(255,255,255,.06)",
                          }}
                        >
                          {tool}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ opacity: 0.6 }}>
                      No tools exposed.
                    </span>
                  )}
                </div>
              )}

              <div className="og-agent-actions">
                <button
                  type="button"
                  onClick={() =>
                    setExpanded(
                      isExpanded ? null : agent.id,
                    )
                  }
                >
                  {isExpanded
                    ? "Hide tools"
                    : "Inspect tools"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
