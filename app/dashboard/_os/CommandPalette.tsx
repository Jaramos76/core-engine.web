"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { interpretCommand, searchEntities } from "@/lib/os/commands";
import { CATEGORY } from "@/lib/os/visual";
import { Glyph } from "./Glyph";
import { useOS } from "./OSProvider";

const QUICK: string[] = [
  "Show today's priorities",
  "Show the timeline",
  "Show all communications",
  "Ask the Building Code Agent about the egress conflict",
  "Show everything related to Del Campo",
  "Whole network",
];

// Mounted only while open (see AgenticWorkspace), so component state starts
// fresh each time. Global ⌘K / Esc handling lives in AgenticWorkspace.
export function CommandPalette() {
  const os = useOS();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(id);
  }, []);

  const entityMatches = useMemo(
    () => (query.trim() ? searchEntities(os.dataset, query, 6) : []),
    [query, os.dataset],
  );

  const interpretation = useMemo(
    () => (query.trim() ? interpretCommand(query, os.dataset) : null),
    [query, os.dataset],
  );

  const rows = useMemo(() => {
    const out: { key: string; label: string; hint: string; run: () => void }[] = [];
    if (interpretation && query.trim()) {
      out.push({
        key: "interpret",
        label: query.trim(),
        hint: interpretation.note,
        run: () => os.runCommand(query),
      });
    }
    for (const e of entityMatches) {
      out.push({
        key: `e-${e.id}`,
        label: e.name,
        hint: CATEGORY[e.category].label,
        run: () => {
          if (e.category === "project") os.focusProject(e.id);
          else os.select(e.id);
          os.togglePalette(false);
        },
      });
    }
    if (!query.trim()) {
      for (const q of QUICK) {
        out.push({
          key: `q-${q}`,
          label: q,
          hint: "command",
          run: () => os.runCommand(q),
        });
      }
    }
    return out;
  }, [interpretation, entityMatches, query, os]);

  return (
    <div className="og-palette-backdrop" onMouseDown={() => os.togglePalette(false)}>
      <div className="og-palette" onMouseDown={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="og-palette-input"
          placeholder="Ask, navigate, or run a command…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setCursor(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setCursor((c) => Math.min(c + 1, rows.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setCursor((c) => Math.max(c - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              rows[cursor]?.run();
            }
          }}
        />
        <ul className="og-palette-list">
          {rows.map((row, i) => (
            <li key={row.key}>
              <button
                type="button"
                data-active={i === cursor}
                onMouseEnter={() => setCursor(i)}
                onClick={() => row.run()}
              >
                <span className="og-palette-label">{row.label}</span>
                <span className="og-palette-hint">{row.hint}</span>
              </button>
            </li>
          ))}
          {rows.length === 0 && (
            <li className="og-palette-empty">No matches</li>
          )}
        </ul>
        <div className="og-palette-foot">
          <span>Up / Down to navigate</span>
          <span>Enter to run</span>
          <span>Esc to close</span>
        </div>
      </div>
    </div>
  );
}
