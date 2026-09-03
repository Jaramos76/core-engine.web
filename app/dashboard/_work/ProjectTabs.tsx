"use client";

import { useSearchParams } from "next/navigation";
import { Children, useEffect, useState, type ReactNode } from "react";

export interface TabDef {
  id: string;
  label: string;
  count?: number;
}

// Panels are passed as children, one per tab, in the same order as `tabs`.
// Rendered server-side; this component toggles which one is visible and honours
// ?tab=<id> plus a #<anchor> in the URL (used for project → task → email jumps).
export function ProjectTabs({
  tabs,
  children,
}: {
  tabs: TabDef[];
  children: ReactNode;
}) {
  const params = useSearchParams();
  const urlTab = params.get("tab");
  const [active, setActive] = useState(
    tabs.some((t) => t.id === urlTab) ? (urlTab as string) : tabs[0]?.id,
  );
  const panels = Children.toArray(children);

  // Adjust the active tab when the ?tab= param changes, during render — the
  // React-blessed alternative to setState-in-effect.
  const [prevUrlTab, setPrevUrlTab] = useState(urlTab);
  if (urlTab !== prevUrlTab) {
    setPrevUrlTab(urlTab);
    if (urlTab && tabs.some((t) => t.id === urlTab)) setActive(urlTab);
  }

  // The anchor scroll + flash is a genuine DOM side effect.
  useEffect(() => {
    if (!urlTab || !tabs.some((t) => t.id === urlTab)) return;
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    requestAnimationFrame(() => {
      const el = document.getElementById(hash);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("wk-flash");
        setTimeout(() => el.classList.remove("wk-flash"), 1600);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlTab]);

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
