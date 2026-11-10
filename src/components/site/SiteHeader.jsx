import { useEffect, useState } from "react";
import { Menu, X, Maximize2, Minimize2, HelpCircle } from "lucide-react";
import ConnectionBadge from "./ConnectionBadge.jsx";
import { NAV_ITEMS, scrollToSection } from "./scroll.js";

export function BrandMark() {
  return (
    <svg viewBox="0 0 42 44" aria-hidden="true">
      <path
        d="M4 36V6l11 8v29m0-29L27 6v30m0-30 11 8v29"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M1 39h40" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export default function SiteHeader({ s, help, setHelp, presenting, onTogglePresentation }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("home");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => e.isIntersecting && setActive(e.target.id));
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    NAV_ITEMS.forEach(([id]) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => {
      window.removeEventListener("scroll", onScroll);
      observer.disconnect();
    };
  }, [presenting]);

  useEffect(() => {
    if (!open) return;
    const esc = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open]);

  const go = (id) => (e) => {
    e.preventDefault();
    setOpen(false);
    if (presenting) onTogglePresentation(false);
    requestAnimationFrame(() => scrollToSection(id, s.reducedMotion));
  };

  return (
    <header className={"apf-header" + (scrolled ? " is-scrolled" : "") + (open ? " menu-open" : "")}>
      <div className="apf-header-inner">
        <a href="#home" className="apf-brand" onClick={go("home")}>
          <span className="apf-brand-mark">
            <BrandMark />
          </span>
          <span className="apf-brand-text">
            <strong>Adaptive Privacy Facade</strong>
            <small>Kinetic facade · IIT (BHU)</small>
          </span>
        </a>

        <nav className="apf-nav" aria-label="Main">
          <ul>
            {NAV_ITEMS.map(([id, label]) => (
              <li key={id}>
                <a
                  href={"#" + id}
                  onClick={go(id)}
                  className={active === id ? "active" : ""}
                  aria-current={active === id ? "true" : undefined}
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="apf-header-tools">
          <ConnectionBadge onClick={go("prototype-connection")} />
          <button
            className="apf-icon-btn apf-hide-sm"
            onClick={() => onTogglePresentation(!presenting)}
            aria-label={presenting ? "Exit presentation" : "Presentation mode"}
            title={presenting ? "Exit presentation" : "Presentation mode"}
          >
            {presenting ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
          </button>
          <button
            className="apf-icon-btn apf-hide-sm"
            aria-label="Keyboard shortcuts"
            title="Keyboard shortcuts"
            onClick={() => setHelp(!help)}
          >
            <HelpCircle size={18} />
          </button>
          <button
            className="apf-icon-btn apf-burger"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="apf-mobile-menu"
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      <div id="apf-mobile-menu" className="apf-mobile-menu" hidden={!open}>
        <ConnectionBadge onClick={go("prototype-connection")} />
        <ul>
          {NAV_ITEMS.map(([id, label], i) => (
            <li key={id}>
              <a href={"#" + id} onClick={go(id)} className={active === id ? "active" : ""}>
                <span>{"0" + (i + 1)}</span>
                {label}
              </a>
            </li>
          ))}
        </ul>
        <div className="apf-mobile-tools">
          <button className="apf-btn apf-btn-ghost" onClick={() => { setOpen(false); onTogglePresentation(!presenting); }}>
            {presenting ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            {presenting ? "Exit presentation" : "Presentation mode"}
          </button>
          <button className="apf-btn apf-btn-ghost" onClick={() => { setOpen(false); setHelp(true); }}>
            <HelpCircle size={16} /> Shortcuts
          </button>
        </div>
      </div>
    </header>
  );
}
