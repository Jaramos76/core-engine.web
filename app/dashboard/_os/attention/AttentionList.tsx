"use client";

import { useMemo } from "react";

import { rankedAttention } from "@/lib/os/attention";
import { CATEGORY, URGENCY_COLOR } from "@/lib/os/visual";
import type { Urgency } from "@/lib/os/types";
import { Glyph } from "../Glyph";
import { useOS } from "../OSProvider";

const BANDS: { u: Urgency; label: string }[] = [
  { u: "now", label: "Now" },
  { u: "soon", label: "Soon" },
  { u: "watch", label: "Watch" },
];

export function AttentionList({ dense = false }: { dense?: boolean }) {
  const os = useOS();
  const items = useMemo(() => rankedAttention(os.attention), [os.attention]);

  const grouped = BANDS.map((b) => ({
    ...b,
    rows: items.filter((i) => i.urgency === b.u),
  })).filter((g) => g.rows.length > 0);

  return (
    <div className="og-attn-list" data-dense={dense}>
      {grouped.map((band) => (
        <section key={band.u}>
          <h3 className="og-attn-band" style={{ color: URGENCY_COLOR[band.u] }}>
            {band.label}
            <span>{band.rows.length}</span>
          </h3>
          <ul>
            {band.rows.map((item) => {
              const e = os.dataset.entities[item.entityId];
              if (!e) return null;
              return (
                <li key={item.entityId}>
                  <button
                    type="button"
                    onClick={() => {
                      os.select(item.entityId);
                      os.toggleInspector(true);
                    }}
                  >
                    <span className="og-attn-glyph">
                      <Glyph
                        shape={CATEGORY[e.category].shape}
                        color={CATEGORY[e.category].color}
                        size={12}
                      />
                    </span>
                    <span className="og-attn-body">
                      <span className="og-attn-name">{e.name}</span>
                      {!dense && (
                        <span className="og-attn-reasons">
                          {item.reasons.join(" · ")}
                        </span>
                      )}
                    </span>
                    <span
                      className="og-attn-meter"
                      title={`${Math.round(item.score * 100)}%`}
                    >
                      <span
                        style={{
                          width: `${Math.round(item.score * 100)}%`,
                          background: URGENCY_COLOR[item.urgency],
                        }}
                      />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {grouped.length === 0 && (
        <p className="og-attn-clear">Nothing needs you. The system is calm.</p>
      )}
    </div>
  );
}
