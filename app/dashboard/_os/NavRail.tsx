"use client";

import { NAV_LENSES, CATEGORY } from "@/lib/os/visual";
import { Glyph } from "./Glyph";
import { useOS } from "./OSProvider";

export function NavRail() {
  const os = useOS();

  return (
    <nav className="og-nav" aria-label="Workspace">
      {NAV_LENSES.map((lens) => {
        const active = os.state.lens === lens.id;
        const sampleCat = lens.categories?.[0];
        return (
          <button
            key={lens.id}
            type="button"
            className="og-nav-item"
            data-active={active}
            onClick={() => os.setLens(lens.id)}
            title={lens.label}
          >
            <span className="og-nav-icon">
              {sampleCat ? (
                <Glyph
                  shape={CATEGORY[sampleCat].shape}
                  color={active ? CATEGORY[sampleCat].color : "currentColor"}
                  size={15}
                />
              ) : (
                <span className="og-nav-home" />
              )}
            </span>
            <span className="og-nav-label">{lens.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
