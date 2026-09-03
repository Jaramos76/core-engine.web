import type { Metadata } from "next";

import { OSProvider } from "./_os/OSProvider";
import { AgenticWorkspace } from "./_os/AgenticWorkspace";
import "./os.css";

export const metadata: Metadata = {
  title: "Core Engine OS",
  robots: { index: false, follow: false },
};

// The Agentic OS — Core Engine's operating environment. First vertical slice:
// spatial graph, agents/projects/tasks as nodes, selection + context inspector,
// search, command palette, active context, attention engine, timeline.
export default function DashboardPage() {
  return (
    <OSProvider>
      <AgenticWorkspace />
    </OSProvider>
  );
}
