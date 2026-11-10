import { useSyncExternalStore } from "react";
import {
  Hand,
  ScanFace,
  PanelsTopLeft,
  Layers,
  Camera,
  Radio,
  Eye,
  CircleDot,
} from "lucide-react";
import { engine } from "../../simulation/engine.js";
import { openingToAngle } from "../../hardware/serial.js";
import { connectionStore } from "../../hardware/connectionStore.js";
import { scrollToSection } from "./scroll.js";
import Reveal from "./Reveal.jsx";

const FOUR_NAMES = ["Left Facade", "Centre-Left Facade", "Centre-Right Facade", "Right Facade"];

// Same mapping the serial table uses: website % → servo 0–180 → panel ≈ servo / 2 (0–90°).
const panelDegrees = (opening) => Math.round(openingToAngle(opening) / 2);

export function ModeSwitch({ s }) {
  const locked = s.compare || s.safety.active;
  return (
    <div className="apf-mode">
      <div className="apf-segmented" role="group" aria-label="Operating mode">
        <button
          className={s.mode === "manual" ? "active" : ""}
          aria-pressed={s.mode === "manual"}
          disabled={locked}
          onClick={() => engine.setMode("manual")}
        >
          <Hand size={17} /> Manual Control
        </button>
        <button
          className={s.mode === "auto" ? "active" : ""}
          aria-pressed={s.mode === "auto"}
          disabled={locked}
          onClick={() => engine.setMode("auto")}
        >
          <ScanFace size={17} /> Automatic Detection
        </button>
        <span className={"apf-seg-thumb " + (s.mode === "auto" ? "right" : "left")} aria-hidden="true" />
      </div>
      <p className="apf-mode-desc">
        {s.safety.active
          ? "Safety demonstration override is active, so mode changes are paused."
          : s.compare
            ? "Comparison view is frozen. Exit comparison to change mode."
            : s.mode === "manual"
              ? "You set each panel with its slider. Your values become the panel targets."
              : s.cameraInput.driving
                ? "Camera detections are setting the panel targets right now."
                : "The facade responds to simulated occupants. Start the camera to drive it from real detections."}
      </p>
    </div>
  );
}

function PanelVisual({ deg }) {
  return (
    <svg viewBox="0 0 96 60" className="apf-panel-visual" aria-hidden="true">
      <path d="M8 52 A40 40 0 0 1 48 12" className="apf-arc" />
      <line x1="8" y1="52" x2="88" y2="52" className="apf-floor" />
      <g style={{ transform: `rotate(${-deg}deg)`, transformOrigin: "8px 52px" }} className="apf-leaf-g">
        <rect x="8" y="49" width="64" height="6" rx="1.5" className="apf-leaf" />
        {[18, 28, 38, 48, 58].map((x) => (
          <circle key={x} cx={x} cy="52" r="1.2" className="apf-perf" />
        ))}
      </g>
      <circle cx="8" cy="52" r="3.2" className="apf-hinge" />
    </svg>
  );
}

function hardwareLine(c, index) {
  if (c.phase === "connected" && c.armed) return { tone: "live", text: `Live → Motor ${index + 1}` };
  if (c.phase === "connected") return { tone: "ready", text: "Connected · enable physical control" };
  return { tone: "preview", text: "Preview mode · simulation only" };
}

function PanelCard({ s, i, c }) {
  const value = s.commands[i];
  const deg = panelDegrees(value);
  const disabled = s.mode !== "manual" || s.compare || s.safety.active;
  const name = s.commands.length === 4 ? FOUR_NAMES[i] : "Facade module";
  const hw = hardwareLine(c, i);
  const id = "apf-panel-" + i;
  return (
    <article
      className={"apf-panel-card" + (disabled ? " is-disabled" : "") + (s.selectedModule === i ? " is-selected" : "")}
    >
      <header>
        <span className="apf-panel-num">0{i + 1}</span>
        <div>
          <h3>Panel 0{i + 1}</h3>
          <span>{name}</span>
        </div>
        {s.pending[i] && <span className="apf-chip">Stabilising…</span>}
      </header>
      <div className="apf-panel-readout">
        <PanelVisual deg={deg} />
        <div className="apf-angle">
          <strong>{deg}°</strong>
          <span>{Math.round(value)}% opening</span>
        </div>
      </div>
      <label className="apf-slider" htmlFor={id}>
        <span className="apf-sr">Panel 0{i + 1} angle</span>
        <input
          id={id}
          type="range"
          min={0}
          max={100}
          step={1}
          value={Math.round(value)}
          disabled={disabled}
          aria-valuetext={`${deg} degrees, ${Math.round(value)} percent open`}
          style={{ "--range": value + "%" }}
          onChange={(e) => {
            engine.change({ selectedModule: i });
            engine.setOpening(Number(e.target.value), i);
          }}
        />
        <span className="apf-ticks" aria-hidden="true">
          <span>0°</span>
          <span>45°</span>
          <span>90°</span>
        </span>
      </label>
      <footer>
        <span className={"apf-hw tone-" + hw.tone}>
          <CircleDot size={12} /> {hw.text}
        </span>
      </footer>
      {s.metrics.explanations[i] && <p className="apf-panel-note">{s.metrics.explanations[i]}</p>}
    </article>
  );
}

function AllPanels({ s }) {
  const average = s.commands.reduce((a, b) => a + b, 0) / s.room.modules;
  const mixed = s.commands.some((v) => Math.abs(v - s.commands[0]) > 1);
  const disabled = s.mode !== "manual" || s.compare || s.safety.active;
  return (
    <div className={"apf-all" + (disabled ? " is-disabled" : "")}>
      <div className="apf-all-head">
        <Layers size={18} />
        <div>
          <h3>Control All Panels</h3>
          <span>{mixed ? "Panels are set independently · average shown" : "All panels move together"}</span>
        </div>
        <strong>{panelDegrees(average)}°</strong>
      </div>
      <label className="apf-slider" htmlFor="apf-all-panels">
        <span className="apf-sr">All panels angle</span>
        <input
          id="apf-all-panels"
          type="range"
          min={0}
          max={100}
          step={1}
          value={Math.round(average)}
          disabled={disabled}
          aria-valuetext={`${panelDegrees(average)} degrees`}
          style={{ "--range": average + "%" }}
          onChange={(e) => engine.setOpening(Number(e.target.value))}
        />
        <span className="apf-ticks" aria-hidden="true"><span>0°</span><span>45°</span><span>90°</span></span>
      </label>
      <div className="apf-presets">
        {[["Open", 100], ["Semi-open", 55], ["Privacy", 25], ["Closed", 0]].map(([label, v]) => (
          <button
            key={v}
            disabled={disabled}
            aria-pressed={!mixed && Math.abs(average - v) < 0.5}
            onClick={() => engine.setOpening(v)}
          >
            {label} <small>{panelDegrees(v)}°</small>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function PanelDashboard({ s }) {
  const c = useSyncExternalStore(connectionStore.subscribe, connectionStore.getSnapshot);
  const manual = s.mode === "manual";
  return (
    <div className="apf-dashboard">
      <Reveal className="apf-dash-top">
        <ModeSwitch s={s} />
        <div className={"apf-hw-banner tone-" + (c.phase === "connected" ? (c.armed ? "live" : "ready") : "preview")}>
          {c.phase === "connected" ? <Radio size={18} /> : <Eye size={18} />}
          <div>
            <strong>
              {c.phase === "connected"
                ? c.armed
                  ? "Physical prototype is following these targets"
                  : "Prototype connected · physical control not enabled"
                : "Preview mode"}
            </strong>
            <span>
              {c.phase === "connected"
                ? c.armed
                  ? "Slider changes are sent to the matching motor."
                  : "Enable physical control in Prototype Connection to move the motors."
                : "Controls drive the 3D model. Connect the prototype to move real panels."}
            </span>
          </div>
          <button className="apf-btn apf-btn-ghost apf-btn-sm" onClick={() => scrollToSection("prototype-connection", s.reducedMotion)}>
            <PanelsTopLeft size={15} /> Prototype
          </button>
        </div>
      </Reveal>

      {!manual && !s.safety.active && (
        <div className="apf-auto-hint" role="note">
          <ScanFace size={18} />
          <p>
            Automatic mode is on, so the sliders show the live targets. Choose
            <b> Manual Control</b> to set panels yourself, or open the camera to drive them from real detections.
          </p>
          <button className="apf-btn apf-btn-primary apf-btn-sm" onClick={() => scrollToSection("camera-detection", s.reducedMotion)}>
            <Camera size={15} /> Camera Detection
          </button>
        </div>
      )}

      <div className="apf-panel-grid">
        {s.commands.map((_, i) => (
          <Reveal key={i} delay={i * 0.06}>
            <PanelCard s={s} i={i} c={c} />
          </Reveal>
        ))}
      </div>
      <Reveal>
        <AllPanels s={s} />
      </Reveal>
      <p className="apf-fineprint">
        0° = flat screen, 90° = folded aside. Degrees are approximate panel targets
        (servo command 0–180 ÷ 2); actual travel is not measured.
      </p>
    </div>
  );
}
