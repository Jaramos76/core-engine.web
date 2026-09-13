"use client";

import { Html, Line, OrbitControls, Stars } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useState } from "react";
import * as THREE from "three";

type BrainNode = {
  id: string;
  type: string;
  label: string;
  state?: string;
  properties?: Record<string, unknown>;
};

type BrainEdge = {
  id: string;
  source: string;
  target: string;
  type: string;
};

type BrainGraph = {
  source: string;
  node_count: number;
  edge_count: number;
  nodes: BrainNode[];
  edges: BrainEdge[];
};

type Models = {
  current_model?: string;
  alternate_model?: string;
  installed_models?: string[];
  benchmark?: {
    qwen?: { tokens_per_second?: number; total_seconds?: number };
    gpt_oss?: { tokens_per_second?: number; total_seconds?: number };
  };
};

function hash(text: string) {
  let value = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    value ^= text.charCodeAt(i);
    value = Math.imul(value, 16777619);
  }
  return Math.abs(value >>> 0);
}

function positionFor(node: BrainNode, index: number, count: number) {
  if (node.id === "core-engine") {
    return new THREE.Vector3(0, 0, 0);
  }

  const seed = hash(node.id);
  const phi = Math.acos(1 - (2 * (index + 1)) / (count + 1));
  const theta = Math.PI * (1 + Math.sqrt(5)) * (index + 1) + (seed % 100) / 50;
  const radius =
    node.type === "agent"
      ? 7
      : node.type === "linked_source"
        ? 12
        : node.type === "audit"
          ? 15
          : 9.5;

  return new THREE.Vector3(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

function nodeColor(node: BrainNode) {
  if (node.id === "core-engine") return "#67e8f9";
  if (node.type === "linked_source") return "#c084fc";
  if (node.type === "audit") {
    return node.state === "working" ? "#34d399" : "#fb923c";
  }
  if (node.type?.includes("agent")) return "#60a5fa";
  if (node.state === "offline") return "#64748b";
  return "#94a3b8";
}

function BrainScene({
  graph,
  selected,
  onSelect,
  visibleIds,
}: {
  graph: BrainGraph;
  selected: string | null;
  onSelect: (node: BrainNode) => void;
  visibleIds: Set<string>;
}) {
  const positions = useMemo(() => {
    const map = new Map<string, THREE.Vector3>();
    graph.nodes.forEach((node, index) => {
      map.set(node.id, positionFor(node, index, graph.nodes.length));
    });
    return map;
  }, [graph]);

  return (
    <>
      <ambientLight intensity={0.7} />
      <pointLight position={[8, 12, 10]} intensity={40} />
      <Stars radius={80} depth={40} count={1400} factor={2.2} fade speed={0.25} />

      {graph.edges.map((edge) => {
        if (!visibleIds.has(edge.source) || !visibleIds.has(edge.target)) return null;
        const a = positions.get(edge.source);
        const b = positions.get(edge.target);
        if (!a || !b) return null;
        return (
          <Line
            key={edge.id}
            points={[a, b]}
            color="#334155"
            transparent
            opacity={0.6}
            lineWidth={0.6}
          />
        );
      })}

      {graph.nodes.map((node) => {
        if (!visibleIds.has(node.id)) return null;
        const pos = positions.get(node.id);
        if (!pos) return null;

        const active = selected === node.id;
        const scale = node.id === "core-engine" ? 1.05 : active ? 0.72 : 0.48;

        return (
          <group key={node.id} position={pos}>
            <mesh
              scale={scale}
              onClick={(event) => {
                event.stopPropagation();
                onSelect(node);
              }}
            >
              <sphereGeometry args={[1, 28, 28]} />
              <meshStandardMaterial
                color={nodeColor(node)}
                emissive={nodeColor(node)}
                emissiveIntensity={active ? 0.75 : 0.25}
                roughness={0.4}
              />
            </mesh>

            {(active || node.id === "core-engine") && (
              <Html distanceFactor={11} position={[0, 0.85, 0]} center>
                <div
                  style={{
                    whiteSpace: "nowrap",
                    border: "1px solid #334155",
                    background: "rgba(2,6,23,.9)",
                    padding: "4px 8px",
                    borderRadius: 8,
                    color: "#e2e8f0",
                    fontSize: 11,
                    pointerEvents: "none",
                  }}
                >
                  {node.label}
                </div>
              </Html>
            )}
          </group>
        );
      })}

      <OrbitControls
        enableDamping
        dampingFactor={0.06}
        minDistance={4}
        maxDistance={45}
      />
    </>
  );
}

export default function BrainClient() {
  const [graph, setGraph] = useState<BrainGraph | null>(null);
  const [models, setModels] = useState<Models | null>(null);
  const [selected, setSelected] = useState<BrainNode | null>(null);
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("all");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [linkName, setLinkName] = useState("");
  const [linkTarget, setLinkTarget] = useState("");

  const load = useCallback(async () => {
    const [brainResponse, modelResponse] = await Promise.all([
      fetch("/api/v1/brain", { cache: "no-store" }),
      fetch("/api/v1/models", { cache: "no-store" }),
    ]);

    if (!brainResponse.ok) throw new Error("Brain API unavailable");
    setGraph(await brainResponse.json());

    if (modelResponse.ok) {
      setModels(await modelResponse.json());
    }
  }, []);

  useEffect(() => {
    load().catch(() => setMessage("Core Engine Brain is unavailable."));
  }, [load]);

  const nodeTypes = useMemo(
    () =>
      Array.from(new Set(graph?.nodes.map((node) => node.type) ?? [])).sort(),
    [graph],
  );

  const visibleIds = useMemo(() => {
    const term = search.trim().toLowerCase();
    return new Set(
      (graph?.nodes ?? [])
        .filter((node) => {
          const matchesType = kind === "all" || node.type === kind;
          const matchesText =
            !term ||
            node.label.toLowerCase().includes(term) ||
            node.type.toLowerCase().includes(term) ||
            node.id.toLowerCase().includes(term);
          return matchesType && matchesText;
        })
        .map((node) => node.id),
    );
  }, [graph, search, kind]);

  async function runAudit() {
    setBusy(true);
    setMessage("Running evidence-based audit…");
    try {
      const response = await fetch("/api/v1/audit", { method: "POST" });
      const report = await response.json();
      if (!response.ok) throw new Error("audit failed");
      setMessage(
        `Audit: ${report.status} · ${report.critical_working}/${report.critical_total} critical checks working`,
      );
      await load();
    } catch {
      setMessage("Audit could not complete.");
    } finally {
      setBusy(false);
    }
  }

  async function linkSource() {
    if (!linkName.trim() || !linkTarget.trim()) {
      setMessage("Enter a name and target first.");
      return;
    }

    setBusy(true);
    setMessage("Registering linked source…");
    try {
      const response = await fetch("/api/v1/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: linkName.trim(),
          target: linkTarget.trim(),
          purpose: "Core Engine linked knowledge source",
          authority: "reference",
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error("link failed");
      setMessage(result.created ? "Source linked." : "Existing source updated.");
      setLinkName("");
      setLinkTarget("");
      await load();
    } catch {
      setMessage("Source could not be linked.");
    } finally {
      setBusy(false);
    }
  }

  const panel: React.CSSProperties = {
    background: "rgba(6,12,24,.88)",
    border: "1px solid #1e293b",
    borderRadius: 14,
    backdropFilter: "blur(12px)",
    boxShadow: "0 16px 50px rgba(0,0,0,.28)",
  };

  const input: React.CSSProperties = {
    width: "100%",
    background: "#07101f",
    color: "#e2e8f0",
    border: "1px solid #334155",
    borderRadius: 8,
    padding: "9px 10px",
    outline: "none",
  };

  const button: React.CSSProperties = {
    background: "#0f1e35",
    color: "#dbeafe",
    border: "1px solid #334155",
    borderRadius: 8,
    padding: "9px 12px",
    cursor: busy ? "wait" : "pointer",
  };

  return (
    <main
      style={{
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
        background:
          "radial-gradient(circle at 50% 45%, #10213c 0%, #050b16 42%, #02050b 100%)",
        color: "#e2e8f0",
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        position: "relative",
      }}
    >
      <Canvas camera={{ position: [0, 7, 21], fov: 55 }}>
        {graph && (
          <BrainScene
            graph={graph}
            selected={selected?.id ?? null}
            onSelect={setSelected}
            visibleIds={visibleIds}
          />
        )}
      </Canvas>

      <section
        style={{
          ...panel,
          position: "absolute",
          top: 18,
          left: 18,
          width: 330,
          padding: 16,
        }}
      >
        <div style={{ fontSize: 11, color: "#67e8f9", letterSpacing: 1.5 }}>
          CORE ENGINE
        </div>
        <h1 style={{ margin: "3px 0 12px", fontSize: 23, fontWeight: 600 }}>
          3D Brain
        </h1>

        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 12 }}>
          {graph
            ? `${graph.node_count} nodes · ${graph.edge_count} relationships`
            : "Loading graph…"}
        </div>

        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search the brain…"
          style={{ ...input, marginBottom: 8 }}
        />

        <select
          value={kind}
          onChange={(event) => setKind(event.target.value)}
          style={{ ...input, marginBottom: 12 }}
        >
          <option value="all">All node types</option>
          {nodeTypes.map((type) => (
            <option key={type}>{type}</option>
          ))}
        </select>

        <button disabled={busy} onClick={runAudit} style={button}>
          Run Core Engine Audit
        </button>

        <a
          href="/dashboard"
          style={{
            marginLeft: 12,
            color: "#93c5fd",
            fontSize: 12,
            textDecoration: "none",
          }}
        >
          Dashboard
        </a>

        {message && (
          <div style={{ marginTop: 11, color: "#cbd5e1", fontSize: 12 }}>
            {message}
          </div>
        )}
      </section>

      <section
        style={{
          ...panel,
          position: "absolute",
          left: 18,
          bottom: 18,
          width: 330,
          padding: 16,
        }}
      >
        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 9 }}>
          LINK SOURCE
        </div>
        <input
          value={linkName}
          onChange={(event) => setLinkName(event.target.value)}
          placeholder="Source name"
          style={{ ...input, marginBottom: 7 }}
        />
        <input
          value={linkTarget}
          onChange={(event) => setLinkTarget(event.target.value)}
          placeholder="URL, repo or path"
          style={{ ...input, marginBottom: 9 }}
        />
        <button disabled={busy} onClick={linkSource} style={button}>
          Link to Core Engine
        </button>
      </section>

      <section
        style={{
          ...panel,
          position: "absolute",
          top: 18,
          right: 18,
          width: 300,
          padding: 16,
        }}
      >
        <div style={{ fontSize: 11, color: "#94a3b8" }}>
          OLLAMA INTELLIGENCE
        </div>
        <div style={{ marginTop: 7, fontSize: 17 }}>
          {models?.current_model ?? "checking…"}
        </div>

        {models?.alternate_model && (
          <div style={{ marginTop: 4, fontSize: 12, color: "#c084fc" }}>
            A/B: {models.alternate_model}
          </div>
        )}

        {models?.benchmark?.qwen?.tokens_per_second != null && (
          <div style={{ marginTop: 10, fontSize: 11, color: "#94a3b8" }}>
            Qwen: {models.benchmark.qwen.tokens_per_second} tok/s
          </div>
        )}

        {models?.benchmark?.gpt_oss?.tokens_per_second != null && (
          <div style={{ marginTop: 3, fontSize: 11, color: "#94a3b8" }}>
            GPT-OSS: {models.benchmark.gpt_oss.tokens_per_second} tok/s
          </div>
        )}
      </section>

      {selected && (
        <section
          style={{
            ...panel,
            position: "absolute",
            right: 18,
            bottom: 18,
            width: 330,
            maxHeight: "42vh",
            overflow: "auto",
            padding: 16,
          }}
        >
          <div style={{ color: "#67e8f9", fontSize: 11 }}>
            {selected.type.toUpperCase()}
          </div>
          <h2 style={{ fontSize: 17, margin: "5px 0 10px" }}>
            {selected.label}
          </h2>
          <div style={{ color: "#94a3b8", fontSize: 11 }}>
            {selected.id}
          </div>
          {selected.state && (
            <div style={{ marginTop: 8, fontSize: 12 }}>
              State: {selected.state}
            </div>
          )}
          {selected.properties &&
            Object.entries(selected.properties).map(([key, value]) => (
              <div
                key={key}
                style={{
                  borderTop: "1px solid #1e293b",
                  marginTop: 8,
                  paddingTop: 8,
                  fontSize: 11,
                }}
              >
                <span style={{ color: "#94a3b8" }}>{key}: </span>
                {typeof value === "string"
                  ? value
                  : JSON.stringify(value)}
              </div>
            ))}
        </section>
      )}
    </main>
  );
}
