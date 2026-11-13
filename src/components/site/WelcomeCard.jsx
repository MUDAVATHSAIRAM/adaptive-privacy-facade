import { useEffect, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Usb, Compass, X, Info } from "lucide-react";
import { connectionStore } from "../../hardware/connectionStore.js";
import { scrollToSection } from "./scroll.js";

const KEY = "apf-welcome-dismissed";

function wasDismissed() {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

// Non-blocking welcome card. Shown once per browsing session.
// It never requests USB access on its own: only the Connect button does.
export default function WelcomeCard({ reducedMotion }) {
  const [open, setOpen] = useState(false);
  const c = useSyncExternalStore(connectionStore.subscribe, connectionStore.getSnapshot);

  useEffect(() => {
    if (wasDismissed()) return;
    const t = setTimeout(() => setOpen(true), reducedMotion ? 0 : 700);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (c.phase === "connected") setOpen(false);
  }, [c.phase]);

  useEffect(() => {
    if (!open) return;
    const esc = (e) => e.key === "Escape" && close();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open]);

  function close() {
    setOpen(false);
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {
      /* storage unavailable */
    }
  }

  function connect() {
    // Called directly from the click so the browser's user-gesture rule is met.
    if (c.supported) connectionStore.requestConnect();
    close();
    scrollToSection("prototype-connection", reducedMotion);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          className="apf-welcome"
          role="dialog"
          aria-modal="false"
          aria-labelledby="apf-welcome-title"
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <button className="apf-icon-btn apf-welcome-close" aria-label="Dismiss" onClick={close}>
            <X size={18} />
          </button>
          <span className="apf-kicker">Welcome</span>
          <h2 id="apf-welcome-title">Experience the Adaptive Privacy Facade</h2>
          <p>
            Connect your physical prototype to experience real-time facade
            movement and intelligent privacy control.
          </p>
          <div className="apf-welcome-actions">
            <button className="apf-btn apf-btn-primary" onClick={connect}>
              <Usb size={17} /> Connect Prototype
            </button>
            <button className="apf-btn apf-btn-ghost" onClick={close}>
              <Compass size={17} /> Explore Website
            </button>
          </div>
          <p className="apf-welcome-note">
            <Info size={14} />
            {c.supported
              ? "Requires the ESP32-S3 facade prototype on USB. Your browser will ask you to choose its port."
              : "This browser can’t connect over USB. Use desktop Chrome or Edge with the ESP32-S3 prototype; everything else works here."}
          </p>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
