import Link from "next/link";
import type { ReactNode } from "react";

const NAV = [
  { id: "home", href: "/dashboard/home", label: "Home" },
  { id: "projects", href: "/dashboard/projects", label: "Projects" },
  { id: "tasks", href: "/dashboard/tasks", label: "Tasks" },
  { id: "emails", href: "/dashboard/emails", label: "Emails" },
  { id: "knowledge", href: "/dashboard/knowledge", label: "Knowledge" },
  { id: "ideas", href: "/dashboard/ideas", label: "Ideas" },
  { id: "contacts", href: "/dashboard/contacts", label: "Contacts" },
  { id: "documents", href: "/dashboard/documents", label: "Documents" },
] as const;

export type WorkNavId = (typeof NAV)[number]["id"];

export function WorkShell({
  active,
  children,
}: {
  active: WorkNavId;
  children: ReactNode;
}) {
  return (
    <div className="wk-root">
      <header className="wk-topbar">
        <Link href="/dashboard/home" className="wk-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="" aria-hidden="true" />
          Core Engine
        </Link>
        <nav className="wk-nav">
          {NAV.map((n) => (
            <Link key={n.id} href={n.href} data-active={n.id === active}>
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
