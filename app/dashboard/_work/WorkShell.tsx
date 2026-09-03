import Link from "next/link";
import type { ReactNode } from "react";

const NAV = [
  { href: "/dashboard/projects", label: "Projects" },
  { href: "/dashboard/tasks", label: "Tasks" },
];

export function WorkShell({
  active,
  children,
}: {
  active: "projects" | "tasks";
  children: ReactNode;
}) {
  return (
    <div className="wk-root">
      <header className="wk-topbar">
        <Link href="/dashboard" className="wk-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" aria-hidden="true" />
          Core Engine
        </Link>
        <nav className="wk-nav">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              data-active={n.href.includes(active)}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="wk-topbar-right">
          <Link href="/dashboard">Spatial view →</Link>
        </div>
      </header>
      <main className="wk-main">{children}</main>
    </div>
  );
}
