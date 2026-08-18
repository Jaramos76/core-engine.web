export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container site-footer-inner">
        <div className="brand mono">
          <img
            className="brand-mark"
            src="/logo.svg"
            width={28}
            height={28}
            alt=""
            aria-hidden="true"
          />
          Core Engine
        </div>
        <div className="site-footer-meta mono">
          <span>coreengine.online</span>
          <span>© {year} Core Engine</span>
        </div>
      </div>
    </footer>
  );
}
