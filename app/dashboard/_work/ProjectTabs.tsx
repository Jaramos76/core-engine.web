"use client";

import { Children, useState, type ReactNode } from "react";

export interface TabDef {
  id: string;
  label: string;
  count?: number;
}

// Panels are passed as children, one per tab, in the same order as `tabs`.
// Rendered server-side; this component only toggles which one is visible.
export function ProjectTabs({
  tabs,
  children,
}: {
  tabs: TabDef[];
  children: ReactNode;
}) {
  const [active, setActive] = useState(tabs[0]?.id);
  const panels = Children.toArray(children);

  return (
    <>
      <div className="wk-tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            className="wk-tab"
            data-active={t.id === active}
            aria-selected={t.id === active}
            onClick={() => setActive(t.id)}
          >
            {t.label}
            {t.count != null && <span className="wk-tab-count">{t.count}</span>}
          </button>
        ))}
      </div>
      {tabs.map((t, i) => (
        <div key={t.id} role="tabpanel" hidden={t.id !== active}>
          {panels[i]}
        </div>
      ))}
    </>
  );
}
