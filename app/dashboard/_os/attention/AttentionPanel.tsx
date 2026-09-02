"use client";

import { useOS } from "../OSProvider";
import { AttentionList } from "./AttentionList";

export function AttentionPanel() {
  const os = useOS();
  if (!os.state.attentionPanelOpen) return null;

  return (
    <div className="og-attn-panel">
      <header>
        <span className="mono">Attention</span>
        <button
          type="button"
          onClick={() => os.toggleAttention(false)}
          aria-label="Close"
        >
          ✕
        </button>
      </header>
      <AttentionList dense />
      <footer>
        <button type="button" onClick={() => os.setView("attention")}>
          Open full view
        </button>
      </footer>
    </div>
  );
}
