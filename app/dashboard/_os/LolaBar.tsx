"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

import { LOLA_SUGGESTIONS } from "@/lib/os/commands";
import { useOS } from "./OSProvider";

export function LolaBar() {
  const os = useOS();
  const [value, setValue] = useState("");
  const [expanded, setExpanded] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  const lastLola = [...os.state.lolaLog].reverse().find((l) => l.role === "lola");

  useEffect(() => {
    if (expanded && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [expanded, os.state.lolaLog]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const text = value.trim();
    if (!text) return;
    os.runCommand(text);
    setValue("");
  };

  return (
    <div className="og-lola" data-expanded={expanded}>
      {expanded && (
        <div className="og-lola-log" ref={logRef}>
          {os.state.lolaLog.map((l) => (
            <p key={l.id} className="og-lola-line" data-role={l.role}>
              <span className="og-lola-who">{l.role === "lola" ? "Lola" : "You"}</span>
              <span className="og-lola-text">{l.text}</span>
            </p>
          ))}
        </div>
      )}

      {!expanded && lastLola && (
        <button
          type="button"
          className="og-lola-latest"
          onClick={() => setExpanded(true)}
        >
          <span className="og-lola-who">Lola</span>
          <span className="og-lola-text">{lastLola.text}</span>
        </button>
      )}

      <form className="og-lola-form" onSubmit={submit}>
        <span className="og-lola-orb" data-active={os.dataset.entities["agent-lola"] && true} />
        <input
          type="text"
          placeholder="Ask Lola, or type a command…"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setExpanded(true)}
          aria-label="Command Lola"
        />
        {expanded && (
          <button
            type="button"
            className="og-lola-collapse"
            onClick={() => setExpanded(false)}
            aria-label="Collapse"
          >
            ▾
          </button>
        )}
        <button type="submit" className="og-lola-send">
          Send
        </button>
      </form>

      {expanded && !value && (
        <div className="og-lola-suggestions">
          {LOLA_SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                os.runCommand(s);
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
