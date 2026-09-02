"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";

import { CATEGORY } from "@/lib/os/visual";
import type { Category } from "@/lib/os/types";
import { useOS } from "./OSProvider";

const ForceGraphCanvas = dynamic(
  () => import("./graph/ForceGraphCanvas"),
  {
    ssr: false,
    loading: () => (
      <div className="og-graph-loading">
        <span className="og-spinner" />
        Composing the network
      </div>
    ),
  },
);

interface Menu {
  id: string;
  x: number;
  y: number;
}

const LEGEND: Category[] = [
  "project",
  "agent",
  "task",
  "person",
  "communication",
  "document",
  "event",
  "knowledge",
  "idea",
];

export function SpatialGraph() {
  const os = useOS();
  const [menu, setMenu] = useState<Menu | null>(null);

  const handleOpen = useCallback(
    (id: string) => {
      const entity = os.dataset.entities[id];
      if (!entity) return;
      if (entity.category === "project") os.focusProject(id);
      else os.select(id);
      os.toggleInspector(true);
    },
    [os],
  );

  const handleContext = useCallback((id: string, x: number, y: number) => {
    setMenu({ id, x, y });
  }, []);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("blur", close);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("blur", close);
    };
  }, [menu]);

  const menuEntity = menu ? os.dataset.entities[menu.id] : null;

  return (
    <div className="og-graph">
      <ForceGraphCanvas
        graph={os.graph}
        selectedId={os.state.selectedId}
        hoveredId={os.state.hoveredId}
        visibleIds={os.visibleIds}
        focusIds={os.focusIds}
        attention={os.attention}
        attentionEmphasis={os.state.attentionEmphasis}
        search={os.state.search}
        onSelect={os.select}
        onHover={os.hover}
        onOpen={handleOpen}
        onContextNode={handleContext}
      />

      <div className="og-legend" aria-hidden="true">
        {LEGEND.map((cat) => (
          <span key={cat} className="og-legend-item">
            <span
              className="og-legend-dot"
              style={{ background: CATEGORY[cat].color }}
            />
            {CATEGORY[cat].label}
          </span>
        ))}
      </div>

      {os.state.focusProjectId && (
        <button
          type="button"
          className="og-exit-focus"
          onClick={() => os.clear()}
        >
          ← Whole network
        </button>
      )}

      {(os.state.hoveredId || os.state.selectedId) && (
        <HoverCard />
      )}

      {menu && menuEntity && (
        <ul
          className="og-context-menu"
          style={{ left: menu.x, top: menu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <li className="og-context-title">{menuEntity.name}</li>
          <li>
            <button
              type="button"
              onClick={() => {
                os.select(menu.id);
                os.toggleInspector(true);
                setMenu(null);
              }}
            >
              Inspect
            </button>
          </li>
          {menuEntity.category === "project" && (
            <li>
              <button
                type="button"
                onClick={() => {
                  os.focusProject(menu.id);
                  setMenu(null);
                }}
              >
                Isolate network
              </button>
            </li>
          )}
          <li>
            <button
              type="button"
              onClick={() => {
                os.setFilter([menuEntity.category]);
                setMenu(null);
              }}
            >
              Show all {CATEGORY[menuEntity.category].plural.toLowerCase()}
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => {
                os.runCommand(`everything related to ${menuEntity.name}`);
                setMenu(null);
              }}
            >
              Expand relationships
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}

function HoverCard() {
  const os = useOS();
  const id = os.state.hoveredId ?? os.state.selectedId;
  if (!id) return null;
  const entity = os.dataset.entities[id];
  if (!entity) return null;
  const att = os.attention.get(id);

  return (
    <div className="og-hovercard">
      <span className="og-hovercard-cat" style={{ color: CATEGORY[entity.category].color }}>
        {CATEGORY[entity.category].label}
      </span>
      <span className="og-hovercard-name">{entity.name}</span>
      {entity.summary && <span className="og-hovercard-sum">{entity.summary}</span>}
      {att && (
        <span className="og-hovercard-att">{att.reasons[0]}</span>
      )}
    </div>
  );
}
