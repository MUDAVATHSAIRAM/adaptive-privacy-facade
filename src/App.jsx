import {
  useEffect,
  useState,
  useSyncExternalStore,
  lazy,
  Suspense,
} from "react";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { Camera, RotateCcw, X, Play, Pause } from "lucide-react";
import { engine, CAMERAS } from "./simulation/engine.js";
import { zoneLabel } from "./simulation/navigation.js";
const Scene = lazy(() => import("./scene/Scene.jsx"));
import Controls, {
  Occupancy,
  Environment,
  FacadeControls,
  CameraButtons,
  StudyActions,
} from "./components/Controls.jsx";
import StoryPlayer from "./components/StoryPlayer.jsx";
import PlanInset from "./components/PlanInset.jsx";
import { ROOM_PRESETS } from "./simulation/roomConfig.js";
import { registerModelTools } from "./webmcp.js";
import PrototypeConnection from "./components/PrototypeConnection.jsx";
import LiveCamera from "./components/LiveCamera.jsx";
import SiteHeader from "./components/site/SiteHeader.jsx";
import WelcomeCard from "./components/site/WelcomeCard.jsx";
import Hero from "./components/site/Hero.jsx";
import PanelDashboard from "./components/site/PanelDashboard.jsx";
import HowItWorks from "./components/site/HowItWorks.jsx";
import SiteFooter from "./components/site/SiteFooter.jsx";
import Reveal from "./components/site/Reveal.jsx";
import { scrollToSection } from "./components/site/scroll.js";

function SectionHead({ kicker, title, children, id }) {
  return (
    <Reveal className="apf-section-head">
      <span className="apf-kicker">{kicker}</span>
      <h2 id={id}>{title}</h2>
      {children && <p>{children}</p>}
    </Reveal>
  );
}

export default function App() {
  const s = useSyncExternalStore(engine.subscribe, engine.getSnapshot),
    [help, setHelp] = useState(false);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    engine.change({ reducedMotion: preference.matches });
    const keydown = (e) => {
      if (e.target.closest('input,select,textarea,[contenteditable="true"]'))
        return;
      if (e.key === "Escape") {
        setHelp(false);
        if (engine.state.demo) engine.exitDemo();
        else if (engine.state.compare) engine.setCompare(false);
        else if (engine.state.form !== null) engine.formStage(null);
        engine.change({ presentation: false });
        return;
      }
      if (!engine.state.demo) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        engine.stepDemo(1);
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        engine.stepDemo(-1);
      }
      if (e.code === "Space") {
        e.preventDefault();
        engine.pauseDemo();
      }
    };
    window.addEventListener("keydown", keydown);
    const unregister = registerModelTools();
    let animationFrame,
      previous = performance.now();
    const animate = (now) => {
      if (document.visibilityState !== "hidden")
        engine.tick((now - previous) / 1000);
      previous = now;
      animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);
    return () => {
      window.removeEventListener("keydown", keydown);
      unregister();
      cancelAnimationFrame(animationFrame);
    };
  }, []);
  useEffect(() => {
    if (!s.notice) return;
    const timer = setTimeout(() => engine.change({ notice: "" }), 4500);
    return () => clearTimeout(timer);
  }, [s.notice]);
  const cameraLabel = CAMERAS.find((c) => c[0] === s.camera)?.[1];
  const setPresentation = (presentation) => {
    engine.change({ presentation });
    if (presentation)
      requestAnimationFrame(() => scrollToSection("live-control", true));
  };
  return (
    <MotionConfig reducedMotion={s.reducedMotion ? "always" : "user"}>
    <div className={"app apf-site " + (s.presentation ? "is-presenting" : "")}>
      <a className="apf-skip" href="#live-control">Skip to live control</a>
      <SiteHeader
        s={s}
        help={help}
        setHelp={setHelp}
        presenting={s.presentation}
        onTogglePresentation={setPresentation}
      />
      <main id="main">
        <Hero s={s} />

        <section id="live-control" className="apf-section apf-live" aria-labelledby="live-control-title">
          <div className="apf-container">
            <SectionHead kicker="01 / Live control" title="Live Facade Control" id="live-control-title">
              Explore the 3D studio, then set each perforated panel between 0° and 90°.
              Every change updates the model instantly and, when enabled, the physical prototype.
            </SectionHead>
          </div>
          <div className="apf-container apf-studio-frame">
            <div className="workspace apf-studio">
            <section
              className={
                "stage " +
                (s.compare ? "comparing " : "") +
                (s.demo ? "has-story " : "") +
                (s.safety.active ? "has-safety" : "")
              }
              aria-label="Interactive 3D facade model"
            >
              <Suspense
                fallback={
                  <div className="model-loading" role="status">
                    Loading architectural model…
                  </div>
                }
              >
                <Scene />
              </Suspense>
              <motion.div
                key={s.camera}
                className="camera-fade"
                initial={{ opacity: s.reducedMotion ? 0 : 0.35 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
              />
              <div className="stage-top">
                <div className="view-title">
                  <span className="eyebrow">
                    {s.compare ? "MATCHED COMPARISON" : "LIVE ARCHITECTURAL STUDY"}
                  </span>
                  <strong>
                    {cameraLabel} <span>/</span>{" "}
                    {ROOM_PRESETS[s.room.preset]?.label || "Custom room"}
                  </strong>
                </div>
                <div className="viewport-actions">
                  <button
                    className="icon-button"
                    aria-label="Reset view"
                    title="Reset view"
                    onClick={() => engine.setCamera(s.camera)}
                  >
                    <RotateCcw size={17} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label="Capture view"
                    title="Capture view as PNG"
                    onClick={() =>
                      engine.captureView
                        ? engine.captureView()
                        : engine.change({
                            notice:
                              "Image capture needs the 3D model. Enable WebGL 2 and reload.",
                          })
                    }
                  >
                    <Camera size={18} />
                  </button>
                </div>
              </div>
              {s.safety.active && (
                <div className="safety-banner" role="status">
                  <strong>
                    Safety demonstration override · {s.control.safetyOpening}%
                  </strong>
                  <span>
                    Conceptual control only; not a validated safety system.
                  </span>
                  <button onClick={() => engine.setSafety(false)}>
                    Exit override
                  </button>
                </div>
              )}
              {s.presentation && (
                <div className="presentation-dock">
                  <Occupancy s={s} compact />
                  <Environment s={s} compact />
                  <FacadeControls s={s} compact />
                  <StudyActions s={s} />
                  <button
                    className="icon-button"
                    aria-label="Run demonstration"
                    onClick={() => engine.startDemo()}
                  >
                    <Play size={19} />
                  </button>
                </div>
              )}
              {s.compare && (
                <>
                  <div className="comparison-labels">
                    <div>
                      <span className="eyebrow">01 / OPEN VIEW</span>
                      <strong>100% command</strong>
                    </div>
                    <div>
                      <span className="eyebrow">
                        02 / {s.compareCondition.toUpperCase()} VIEW
                      </span>
                      <strong>
                        {s.compareCondition === "adaptive"
                          ? "Independent targets"
                          : s.compareCondition === "closed"
                            ? "0% command"
                            : "20% command"}
                      </strong>
                    </div>
                  </div>
                  <div className="comparison-divider" />
                  <div className="compare-toolbar">
                    <label className="compare-choice">
                      Compare with
                      <select
                        aria-label="Comparison condition"
                        value={s.compareCondition}
                        onChange={(e) =>
                          engine.change({ compareCondition: e.target.value })
                        }
                      >
                        <option value="filtered">Filtered · 20%</option>
                        <option value="adaptive">Adaptive</option>
                        <option value="closed">Closed · 0%</option>
                      </select>
                    </label>
                    <div className="segments">
                      <button
                        className={s.compareView === "exterior" ? "active" : ""}
                        onClick={() => engine.compareCamera("exterior")}
                      >
                        Exterior view
                      </button>
                      <button
                        className={s.compareView === "interior" ? "active" : ""}
                        onClick={() => engine.compareCamera("interior")}
                      >
                        Interior view
                      </button>
                    </div>
                    <button
                      className="icon-button"
                      aria-label="Exit comparison"
                      onClick={() => engine.setCompare(false)}
                    >
                      <X size={16} />
                    </button>
                  </div>
                </>
              )}
              {s.analysis && !s.compare && (
                <div className="analysis-overlay">
                  <span className="eyebrow">CONCEPTUAL VISIBILITY ANALYSIS</span>
                  <strong>
                    {!s.count
                      ? "Not applicable"
                      : !s.person
                        ? "Select an occupant"
                        : s.exposure
                          ? s.exposure.category + " direct exposure"
                          : "Sampling sight lines…"}
                  </strong>
                  {s.exposure && (
                    <span>
                      {s.exposure.clear} / {s.exposure.total} sampled paths clear
                    </span>
                  )}
                  {s.exposure?.blockers.length > 0 && (
                    <small>
                      Obstructions:{" "}
                      {s.exposure.blockers
                        .map(
                          (k) =>
                            ({
                              screen: "facade",
                              frame: "frame",
                              room: "room",
                              landscape: "landscape",
                              vehicle: "vehicle",
                              ground: "ground",
                            })[k],
                        )
                        .join(", ")}
                    </small>
                  )}
                  <div className="analysis-legend">
                    <span>
                      <i className="clear-line" />
                      Clear path
                    </span>
                    <span>
                      <i />
                      Blocked path
                    </span>
                  </div>
                  <p>Geometry samples; lighting contrast is not quantified.</p>
                </div>
              )}
              {s.form !== null && (
                <div className="form-overlay">
                  <span className="eyebrow">
                    FORM DEVELOPMENT / {"0" + (s.form + 1)}
                  </span>
                  <strong>
                    {
                      [
                        "Flat screen",
                        "Gradient-perforated panel",
                        "Connected bi-fold geometry",
                        "Four independent modules",
                        "Response to occupied zones",
                      ][s.form]
                    }
                  </strong>
                  <button
                    className="text-action"
                    onClick={() => engine.formStage(null)}
                  >
                    Return to model <X size={13} />
                  </button>
                </div>
              )}
              {s.planInset && !s.compare && <PlanInset s={s} />}
              <StoryPlayer s={s} />
              {!s.compare && (
                <div className="camera-dock">
                  <CameraButtons s={s} />
                  <div className="more-views">
                    <select
                      aria-label="All camera views"
                      value={s.camera}
                      onChange={(e) => engine.setCamera(e.target.value)}
                    >
                      {CAMERAS.map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
              <div className="condition-strip">
                <div>
                  <span>INDOOR</span>
                  <strong>
                    {s.count} / {s.capacity}
                  </strong>
                  {(s.entering > 0 || s.leaving > 0) && (
                    <small>
                      {s.entering
                        ? "+" + s.entering + " entering"
                        : s.leaving + " leaving"}
                    </small>
                  )}
                </div>
                <div>
                  <span>LIGHT</span>
                  <strong>{s.environment}</strong>
                  {s.lightOverride !== "auto" && (
                    <small>Lights {s.lightOverride} · override</small>
                  )}
                </div>
                <div className="condition-person">
                  <span>FOCUS</span>
                  <strong>
                    {s.person
                      ? "Person " + String(s.person.id).padStart(2, "0")
                      : "No occupant selected"}
                  </strong>
                  {s.person && <small>{zoneLabel(s.person.zone)}</small>}
                </div>
                <div>
                  <span>FACADE</span>
                  <strong>{s.safety.active ? "Safety demo" : s.mode}</strong>
                  <small>
                    {s.commands.map((c) => Math.round(c) + "%").join(" / ")}
                  </small>
                </div>
                <button
                  className="activity-toggle"
                  disabled={s.compare}
                  onClick={() =>
                    engine.setSurroundings({ motion: !s.surroundings.motion })
                  }
                  aria-label={
                    s.surroundings.motion
                      ? "Pause exterior activity"
                      : "Play exterior activity"
                  }
                >
                  {s.surroundings.motion && !s.compare && !s.demo?.paused ? (
                    <Pause size={14} />
                  ) : (
                    <Play size={14} />
                  )}
                  <span>
                    Exterior{" "}
                    {s.compare || s.demo?.paused || !s.surroundings.motion
                      ? "paused"
                      : "playing"}
                  </span>
                </button>
              </div>
              <AnimatePresence>
                {s.notice && (
                  <motion.div
                    className="toast"
                    role="status"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    {s.notice}
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
              {!s.presentation && <Controls s={s} />}
            </div>
          </div>
          <div className="apf-container">
            <PanelDashboard s={s} />
          </div>
        </section>

        <section id="camera-detection" className="apf-section apf-camera-section" aria-labelledby="camera-title">
          <div className="apf-container">
            <SectionHead kicker="02 / Camera detection" title="AI-Powered Camera Detection" id="camera-title">
              Explore how camera-based human detection can support automatic facade privacy responses.
            </SectionHead>
            <Reveal className="apf-card apf-camera-card">
              <LiveCamera s={s} />
            </Reveal>
          </div>
        </section>

        <section id="how-it-works" className="apf-section" aria-labelledby="how-title">
          <div className="apf-container">
            <SectionHead kicker="03 / How it works" title="Four steps from screen to facade" id="how-title" />
            <HowItWorks />
          </div>
        </section>

        <section id="prototype-connection" className="apf-section apf-proto-section" aria-labelledby="proto-title">
          <div className="apf-container">
            <SectionHead kicker="04 / Prototype connection" title="Connect Your Physical Prototype" id="proto-title">
              Connect your ESP32-S3-powered facade prototype using USB to experience real-time panel movement.
            </SectionHead>
            <Reveal>
              <PrototypeConnection s={s} />
            </Reveal>
          </div>
        </section>
      </main>
      <SiteFooter s={s} />
      <WelcomeCard reducedMotion={s.reducedMotion} />
      {help && (
        <div className="help-backdrop" onClick={() => setHelp(false)}>
          <div
            className="help-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Presentation controls"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="icon-button help-close"
              aria-label="Close shortcuts"
              onClick={() => setHelp(false)}
              autoFocus
            >
              <X size={18} />
            </button>
            <span className="eyebrow">PRESENTATION CONTROLS</span>
            <h2>Explore the study</h2>
            <dl>
              <dt>Drag / scroll</dt>
              <dd>Orbit / zoom in perspective or detail</dd>
              <dt>Click a person</dt>
              <dd>Select an indoor occupant</dd>
              <dt>Click a pedestrian</dt>
              <dd>Use their position as the observer</dd>
              <dt>← / →</dt>
              <dd>Previous / next demonstration scene</dd>
              <dt>Space</dt>
              <dd>Pause / play the demonstration</dd>
              <dt>Esc</dt>
              <dd>Exit a temporary or presentation view</dd>
              <dt>Camera icon</dt>
              <dd>Save the current view as a PNG</dd>
            </dl>
            <p>
              Closed perforated panels provide stronger screening, with some
              views and light still passing through.
            </p>
          </div>
        </div>
      )}
    </div>
    </MotionConfig>
  );
}
