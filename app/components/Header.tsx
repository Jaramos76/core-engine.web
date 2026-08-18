const links = [
  { href: "#what-is", label: "Overview" },
  { href: "#architecture", label: "Architecture" },
  { href: "#principles", label: "Principles" },
  { href: "#status", label: "Status" },
  { href: "#developers", label: "Developers" },
];

export default function Header() {
  return (
    <header className="site-header">
      <div className="container site-header-inner">
        <a href="#top" className="brand mono">
          <img className="brand-mark" src="/logo.svg" alt="" aria-hidden="true" />
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
      </div>
    </header>
  );
}
