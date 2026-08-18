"use client";

import { useState } from "react";

const links = [
  { href: "#what-is", label: "Overview" },
  { href: "#architecture", label: "Architecture" },
  { href: "#principles", label: "Principles" },
  { href: "#status", label: "Status" },
  { href: "#developers", label: "Developers" },
];

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="container site-header-inner">
        <a href="#top" className="brand mono">
          <img
            className="brand-mark"
            src="/logo.svg"
            width={32}
            height={32}
            alt=""
            aria-hidden="true"
          />
          Core Engine
        </a>
        <nav className="site-nav" aria-label="Primary">
          <ul>
            {links.map((link) => (
              <li key={link.href}>
                <a href={link.href}>{link.label}</a>
              </li>
            ))}
          </ul>
        </nav>
        <button
          type="button"
          className="nav-toggle"
          aria-label="Toggle navigation menu"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="nav-toggle-line" />
          <span className="nav-toggle-line" />
          <span className="nav-toggle-line" />
        </button>
      </div>
      {open && (
        <nav id="mobile-nav" className="mobile-nav" aria-label="Primary">
          <ul>
            {links.map((link) => (
              <li key={link.href}>
                <a href={link.href} onClick={() => setOpen(false)}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
