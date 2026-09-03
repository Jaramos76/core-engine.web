"use client";

import { useRouter } from "next/navigation";

import { signOut } from "@/app/login/_auth/authService";
import type { OSView } from "@/lib/os/types";
import { SystemCube } from "./SystemCube";
import { SystemStatus } from "./SystemStatus";
import { useOS } from "./OSProvider";

const VIEWS: { id: OSView; label: string }[] = [
  { id: "graph", label: "Graph" },
  { id: "timeline", label: "Timeline" },
  { id: "attention", label: "Attention" },
  { id: "agents", label: "Agents" },
];

export function TopBar() {
  const os = useOS();
  const router = useRouter();

  return (
    <header className="og-topbar">
      <div className="og-brand">
        <SystemCube />
        <span className="og-brand-name mono">Core Engine</span>
      </div>

      <div className="og-viewswitch" role="tablist" aria-label="Workspace view">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            role="tab"
            aria-selected={os.state.view === v.id}
            className="og-viewswitch-btn"
            data-active={os.state.view === v.id}
            onClick={() => os.setView(v.id)}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className="og-topbar-right">
        <div className="og-search">
          <input
            type="search"
            placeholder="Search the network…"
            value={os.state.search}
            onChange={(e) => os.setSearch(e.target.value)}
            aria-label="Search entities"
          />
        </div>
        <button
          type="button"
          className="og-palette-key"
          onClick={() => os.togglePalette(true)}
          title="Command palette"
        >
          <kbd>⌘</kbd>
          <kbd>K</kbd>
        </button>
        <SystemStatus />
        <button
          type="button"
          className="og-signout"
          onClick={async () => {
            await signOut();
            router.push("/login");
          }}
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
