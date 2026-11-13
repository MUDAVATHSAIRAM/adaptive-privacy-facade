import { useSyncExternalStore } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Usb, SlidersHorizontal, Camera, ArrowDown, Users, Sun, Activity } from "lucide-react";
import { connectionStore, PHASE_LABEL } from "../../hardware/connectionStore.js";
import { scrollToSection } from "./scroll.js";
import { openingToAngle } from "../../hardware/serial.js";

const rise = (delay) => ({
  initial: { opacity: 0, y: 26, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { type: "spring", stiffness: 140, damping: 20, mass: 0.9, delay },
});

// Subtle 3D tilt that follows the pointer (desktop only, off for reduced motion).
function useTilt(disabled) {
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const spring = { stiffness: 160, damping: 18, mass: 0.6 };
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [7, -7]), spring);
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-9, 9]), spring);
  const onPointerMove = (e) => {
    if (disabled || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onPointerLeave = () => {
    px.set(0);
    py.set(0);
  };
  return { style: disabled ? undefined : { rotateX, rotateY, transformPerspective: 1100 }, onPointerMove, onPointerLeave };
}

function FacadeGlyph({ commands }) {
  // Plan-view sketch of the live module commands (0% flat → 100% folded aside).
  const n = commands.length;
  const w = 300 / n;
  return (
    <svg viewBox="0 0 320 120" className="apf-glyph" aria-hidden="true">
      <line x1="10" y1="96" x2="310" y2="96" className="apf-glyph-wall" />
      {commands.map((c, i) => {
        const angle = (Math.max(0, Math.min(100, c)) / 100) * 90;
        const x = 10 + i * w + 6;
        const len = w - 12;
        const rad = (angle * Math.PI) / 180;
        return (
          <g key={i}>
            <line x1={x} y1="88" x2={x + len} y2="88" className="apf-glyph-ghost" />
            <line
              x1={x}
              y1="88"
              x2={x + Math.cos(rad) * len}
              y2={88 - Math.sin(rad) * len}
              className="apf-glyph-leaf"
            />
            <circle cx={x} cy="88" r="3" className="apf-glyph-hinge" />
            <text x={x + len / 2} y="114" textAnchor="middle">M0{i + 1}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function Hero({ s }) {
  const c = useSyncExternalStore(connectionStore.subscribe, connectionStore.getSnapshot);
  const tilt = useTilt(s.reducedMotion);
  const connect = () => {
    if (c.supported && c.phase !== "connected") connectionStore.requestConnect();
    scrollToSection("prototype-connection", s.reducedMotion);
  };
  return (
    <section id="home" className="apf-hero" aria-labelledby="apf-hero-title">
      <div className="apf-container apf-hero-grid">
        <div className="apf-hero-copy">
          <motion.span className="apf-eyebrow-pill" {...rise(0.05)}>
            <i /> Interactive architectural prototype
          </motion.span>
          <motion.h1 id="apf-hero-title" {...rise(0.12)}>
            Adaptive <span>Privacy</span> Facade
          </motion.h1>
          <motion.p className="apf-hero-sub" {...rise(0.2)}>
            An Intelligent Architectural Facade System for Dynamic Privacy,
            Responsive Design, and Real-Time Environmental Interaction.
          </motion.p>
          <motion.div className="apf-hero-ctas" {...rise(0.28)}>
            <button className="apf-btn apf-btn-primary apf-btn-lg" onClick={connect}>
              <Usb size={19} /> Connect Prototype
            </button>
            <button
              className="apf-btn apf-btn-glass apf-btn-lg"
              onClick={() => scrollToSection("live-control", s.reducedMotion)}
            >
              <SlidersHorizontal size={19} /> Explore Controls
            </button>
          </motion.div>
          <motion.p className="apf-hero-note" {...rise(0.36)}>
            Move each of the four perforated panels by hand, or let the camera
            detect people and adjust privacy automatically. No hardware needed to
            explore.
          </motion.p>
        </div>

        <motion.div
          className="apf-hero-card apf-glass"
          {...rise(0.3)}
          style={tilt.style}
          onPointerMove={tilt.onPointerMove}
          onPointerLeave={tilt.onPointerLeave}
        >
          <div className="apf-hero-card-head">
            <span className="apf-kicker">Live facade state</span>
            <span className={"apf-mini-status phase-" + c.phase}>
              <i /> {PHASE_LABEL[c.phase]}
            </span>
          </div>
          <FacadeGlyph commands={s.commands} />
          <div className="apf-hero-bars">
            {s.commands.map((cmd, i) => (
              <div key={i}>
                <span>M0{i + 1}</span>
                <div className="apf-bar"><i style={{ width: cmd + "%" }} /></div>
                <strong>{Math.round(openingToAngle(cmd) / 2)}°</strong>
              </div>
            ))}
          </div>
          <div className="apf-hero-facts">
            <div><Activity size={15} /><span>Mode</span><strong>{s.safety.active ? "Safety" : s.mode === "auto" ? (s.cameraInput.driving ? "Auto · camera" : "Automatic") : "Manual"}</strong></div>
            <div><Users size={15} /><span>Occupants</span><strong>{s.count} / {s.capacity}</strong></div>
            <div><Sun size={15} /><span>Light</span><strong>{s.environment}</strong></div>
          </div>
          <button
            className="apf-hero-camera-link"
            onClick={() => scrollToSection("camera-detection", s.reducedMotion)}
          >
            <Camera size={16} /> Try AI camera detection
          </button>
        </motion.div>
      </div>
      <button
        className="apf-scroll-cue"
        aria-label="Scroll to live control"
        onClick={() => scrollToSection("live-control", s.reducedMotion)}
      >
        <ArrowDown size={18} />
      </button>
    </section>
  );
}
