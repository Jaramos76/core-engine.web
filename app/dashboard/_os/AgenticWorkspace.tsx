"use client";

// Top-level Agentic OS shell. Assembles the persistent frame — brand + status,
// active context, left lens rail, the center workspace (graph / timeline /
// attention / agents), the contextual inspector, and Lola's command bar — plus
// the global command palette and attention slide-over.

import { useEffect } from "react";

import { TopBar } from "./TopBar";
import { ActiveContextBar } from "./ActiveContextBar";
import { NavRail } from "./NavRail";
import { SpatialGraph } from "./SpatialGraph";
import { ContextInspector } from "./ContextInspector";
import { LolaBar } from "./LolaBar";
import { CommandPalette } from "./CommandPalette";
import { AttentionPanel } from "./attention/AttentionPanel";
import { AttentionView } from "./views/AttentionView";
import { AgentsView } from "./views/AgentsView";
import { TimelineView } from "./views/TimelineView";
import { useOS } from "./OSProvider";

export function AgenticWorkspace() {
  const os = useOS();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !os.state.paletteOpen && os.state.selectedId) {
        os.select(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [os]);

  return (
    <div className="og-root" data-view={os.state.view}>
      <TopBar />
      <ActiveContextBar />

      <div className="og-main">
        <NavRail />

        <div className="og-center">
          {os.state.view === "graph" && <SpatialGraph />}
          {os.state.view === "timeline" && <TimelineView />}
          {os.state.view === "attention" && <AttentionView />}
          {os.state.view === "agents" && <AgentsView />}
        </div>

        <ContextInspector />
      </div>

      <LolaBar />

      <AttentionPanel />
      <CommandPalette />
    </div>
  );
}
