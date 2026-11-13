import { useState } from "react";
import {
  Sun,
  Sunset,
  Moon,
  Plus,
  Minus,
  Play,
  Eye,
  Columns2,
  ChevronDown,
  RotateCcw,
  PersonStanding,
  Trees,
  SlidersHorizontal,
  ScanEye,
  Layers,
  Camera,
} from "lucide-react";
import {
  engine,
  CAMERAS,
  PRESETS,
  BASELINES,
  autoCommands,
} from "../simulation/engine.js";
import { Toggle, Range, Section } from "./Widgets.jsx";
import RoomDesigner from "./RoomDesigner.jsx";
import Dashboard from "./Dashboard.jsx";
import FloorPlan from "./FloorPlan.jsx";
import { controlActors } from "../simulation/control.js";
import { zoneLabel } from "../simulation/navigation.js";

export { Toggle, Range, Section } from "./Widgets.jsx";
export function Occupancy({ s, compact = false }) {
  return (
    <div className={"occupancy-control " + (compact ? "compact" : "")}>
      {!compact && (
        <div className="control-heading">
          <span className="eyebrow">01 / OCCUPANCY</span>
          <span className="subtle">Indoor only</span>
        </div>
      )}
      <div className="occupancy-row">
        <button
          className="square"
          aria-label="Remove one person"
          disabled={s.targetCount === 0 || s.compare || s.cameraInput.driving}
          onClick={() => engine.minus()}
        >
          <Minus size={20} />
        </button>
        <div className="occupancy-number">
          <strong data-testid="occupancy-count">{s.count}</strong>
          <span>/ {s.capacity}</span>
        </div>
        <button
          className="square"
          aria-label="Add one person"
          disabled={
            s.targetCount >= s.capacity ||
            s.reserved >= s.capacity ||
            s.compare ||
            s.cameraInput.driving
          }
          onClick={() => engine.plus()}
        >
          <Plus size={20} />
        </button>
      </div>
      {!compact && (
        <>
          <div className="pending" aria-live="polite">
            {s.entering || s.leaving
              ? [
                  s.entering ? s.entering + " entering" : null,
                  s.leaving ? s.leaving + " leaving" : null,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : s.count === s.capacity
                ? `Full simulation · ${s.capacity} / ${s.capacity}`
                : s.count === 0
                  ? "The room is ready for arrival."
                  : "People in the shared studio."}
          </div>
          <div className="quick-targets" aria-label="Occupancy targets">
            {[
              ...new Set([0, 1, 7, 14, 21].map((n) => Math.min(n, s.capacity))),
            ].map((n) => (
              <button
                key={n}
                onClick={() => engine.setTarget(n)}
                disabled={s.compare || s.cameraInput.driving}
                className={s.targetCount === n ? "active" : ""}
                aria-pressed={s.targetCount === n}
              >
                {n === 0 ? "Empty" : n}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
export function Environment({ s, compact = false }) {
  return (
    <div className={"environment-control " + (compact ? "compact" : "")}>
      {!compact && (
        <div className="control-heading">
          <span className="eyebrow">02 / THROUGH THE DAY</span>
        </div>
      )}
      <div className="segments environment" aria-label="Environment">
        {[
          ["day", "Day", Sun],
          ["evening", "Evening", Sunset],
          ["night", "Night", Moon],
        ].map(([key, label, Icon]) => (
          <button
            key={key}
            disabled={s.compare || s.safety.active}
            className={s.environment === key ? "active" : ""}
            aria-pressed={s.environment === key}
            onClick={() => engine.change({ environment: key, preset: null })}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
export function FacadeControls({ s, compact = false }) {
  const average = s.commands.reduce((a, b) => a + b, 0) / s.room.modules,
    mixed = s.commands.some((c) => Math.abs(c - s.commands[0]) > 1);
  return (
    <div className={"facade-control " + (compact ? "compact" : "")}>
      {!compact && (
        <div className="control-heading">
          <span className="eyebrow">03 / FACADE RESPONSE</span>
        </div>
      )}
      <div className="segments" aria-label="Operating mode">
        <button
          className={s.mode === "auto" ? "active" : ""}
          aria-pressed={s.mode === "auto"}
          disabled={s.compare || s.safety.active}
          onClick={() => engine.setMode("auto")}
        >
          Auto
        </button>
        <button
          className={s.mode === "manual" ? "active" : ""}
          aria-pressed={s.mode === "manual"}
          disabled={s.compare || s.safety.active}
          onClick={() => engine.setMode("manual")}
        >
          Manual
        </button>
      </div>
      {s.mode === "manual" ? (
        <>
          <Range
            label={mixed ? "Average opening command" : "Facade opening"}
            value={average}
            onChange={(value) => engine.setOpening(value)}
            disabled={s.compare || s.safety.active}
            id={compact ? "presentation-opening" : "global-opening"}
          />
          {!compact && (
            <div className="opening-presets">
              {[
                ["Open", 100],
                ["Semi-open", 55],
                ["Privacy", 25],
                ["Closed", 0],
              ].map(([label, value]) => (
                <button
                  key={value}
                  aria-pressed={!mixed && Math.abs(average - value) < 0.5}
                  onClick={() => engine.setOpening(value)}
                  disabled={s.compare || s.safety.active}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          {mixed && !compact && (
            <p className="small-note">Mixed module openings</p>
          )}
        </>
      ) : (
        !compact && (
          <div className="module-readout">
            {s.commands.map((c, i) => (
              <div key={i}>
                <span>M{"0" + (i + 1)}</span>
                <div className="command-track">
                  <i style={{ width: c + "%" }} />
                </div>
                <strong>{Math.round(c)}%</strong>
              </div>
            ))}
          </div>
        )
      )}
      {!compact && <p className="response-note">{engine.getExplanation()}</p>}
    </div>
  );
}
export function CameraButtons({ s, all = false }) {
  return (
    <div className={"camera-buttons " + (all ? "all" : "")}>
      {CAMERAS.filter(
        (c) => all || ["perspective", "interior", "exterior"].includes(c[0]),
      ).map(([key, label]) => (
        <button
          key={key}
          className={s.camera === key ? "active" : ""}
          aria-pressed={s.camera === key}
          onClick={() =>
            s.compare ? engine.compareCamera(key) : engine.setCamera(key)
          }
          disabled={s.compare && !["interior", "exterior"].includes(key)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
export function StudyActions({ s }) {
  return (
    <div className="study-actions">
      <button
        className={"outline-button " + (s.analysis ? "active" : "")}
        disabled={s.compare || s.safety.active}
        onClick={() => engine.change({ analysis: !s.analysis })}
        aria-pressed={s.analysis}
      >
        <ScanEye size={16} />
        Privacy analysis
      </button>
      <button
        className={"outline-button " + (s.compare ? "active" : "")}
        disabled={s.safety.active}
        onClick={() => engine.setCompare(!s.compare)}
        aria-pressed={s.compare}
      >
        <Columns2 size={16} />
        Compare privacy
      </button>
    </div>
  );
}
export function ObserverControls({ s }) {
  return (
    <div className="observer-controls">
      <div className="control-heading">
        <span className="eyebrow">OUTSIDE OBSERVER</span>
      </div>
      <Toggle
        label="Show observer marker"
        checked={s.observer.visible}
        onChange={(visible) => engine.setObserver({ visible })}
      />
      <div className="segments small">
        {[
          ["Near", -3.65],
          ["Middle", -5.5],
          ["Far", -7.2],
        ].map(([label, z]) => (
          <button
            key={label}
            onClick={() => engine.setObserver({ z })}
            className={Math.abs(s.observer.z - z) < 0.05 ? "active" : ""}
          >
            {label}
          </button>
        ))}
      </div>
      <Range
        label="Left / right position"
        value={s.observer.x * 10}
        min={-45}
        max={45}
        suffix=""
        onChange={(x) => engine.setObserver({ x: x / 10 })}
        id="observer-position"
      />
      <p className="small-note">
        {Math.abs(s.observer.z).toFixed(1)} m from the frontage
      </p>
      <div className="three-buttons">
        {[
          ["Left oblique", -4],
          ["Front", 0],
          ["Right oblique", 4],
        ].map(([label, x]) => (
          <button
            key={label}
            onClick={() => engine.setObserver({ x, z: -5.5 })}
          >
            {label}
          </button>
        ))}
      </div>
      <button
        className="text-action"
        onClick={() => engine.setCamera("observer")}
      >
        <Eye size={15} />
        View through observer’s eyes
      </button>
    </div>
  );
}
function ThroughDay({ s }) {
  return (
    <div className="day-study">
      <span className="eyebrow">OCCUPIED ZONES / AUTO COMMANDS</span>
      <div className="day-cards">
        {["day", "evening", "night"].map((environment) => {
          const result = autoCommands(
            controlActors(engine.state),
            environment,
            s.observer,
            s.room,
            s.control,
            s.lightOverride,
          );
          return (
            <button
              key={environment}
              className={
                "day-card " +
                environment +
                (s.environment === environment ? " active" : "")
              }
              onClick={() => engine.change({ environment })}
            >
              <strong>{environment}</strong>
              <div className="mini-bars">
                {result.commands.map((c, i) => (
                  <i key={i} style={{ height: Math.max(5, c * 0.3) + "px" }} />
                ))}
              </div>
              <span>{result.commands.map(Math.round).join(" / ")}</span>
            </button>
          );
        })}
      </div>
      <p className="small-note">
        Active module opening commands. Select a condition to view it in the
        model.
      </p>
    </div>
  );
}
export default function Controls({ s }) {
  return (
    <aside className="controls" aria-label="Simulation controls">
      <nav className="tool-shortcuts" aria-label="Workspace sections">
        {[
          ["room-designer", "Design"],
          ["performance-dashboard", "Dashboard"],
          ["camera-detection", "Camera"],
          ["prototype-connection", "Prototype"],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => {
              const el = document.getElementById(id);
              if (el) {
                el.open = true;
                el.scrollIntoView({
                  behavior: s.reducedMotion ? "auto" : "smooth",
                  block: "start",
                });
              }
            }}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="primary-controls">
        <Occupancy s={s} />
        <Environment s={s} />
        <FacadeControls s={s} />
        <button
          className="demo-launch"
          onClick={() => (s.demo ? engine.exitDemo() : engine.startDemo())}
        >
          <Play size={17} />
          <span>
            {s.demo ? "Exit demonstration" : "Run privacy demonstration"}
          </span>
        </button>
        <StudyActions s={s} />
      </div>
      <div className="secondary-controls">
        <Section title="Room Designer" icon={Layers}>
          <RoomDesigner s={s} />
        </Section>
        <Section title="Performance Dashboard" icon={SlidersHorizontal}>
          <Dashboard s={s} />
        </Section>
        <Section title="Control settings & safety" icon={SlidersHorizontal}>
          <Range
            label="Privacy preference"
            value={s.control.privacy}
            onChange={(privacy) => engine.setControl({ privacy })}
          />
          <p className="small-note">
            Higher values close affected panels further. Unaffected zones keep
            their views.
          </p>
          <Range
            label="Stability delay"
            value={s.control.stabilityDelay}
            min={0.2}
            max={2}
            step={0.1}
            suffix=" s"
            onChange={(stabilityDelay) => engine.setControl({ stabilityDelay })}
          />
          <Range
            label="Empty-room opening"
            value={s.control.emptyOpening}
            onChange={(emptyOpening) => engine.setControl({ emptyOpening })}
          />
          <Range
            label="Safety demonstration opening"
            value={s.control.safetyOpening}
            onChange={(safetyOpening) => engine.setControl({ safetyOpening })}
          />
          <button
            className="safety-button"
            aria-pressed={s.safety.active}
            onClick={() => engine.setSafety(!s.safety.active)}
          >
            {s.safety.active
              ? "Exit safety override"
              : "Simulate safety override"}
          </button>
          <p className="small-note">
            Conceptual demonstration only. This is not a validated building
            safety system.
          </p>
        </Section>
        <div className="apf-aside-jumps">
          {[
            ["camera-detection", "Live Camera Mode", "AI person detection", Camera],
            ["prototype-connection", "Physical Prototype Connection", "ESP32-S3 over USB", SlidersHorizontal],
          ].map(([id, title, sub, Icon]) => (
            <a
              key={id}
              href={"#" + id}
              onClick={(e) => {
                const el = document.getElementById(id);
                if (!el) return;
                e.preventDefault();
                el.scrollIntoView({
                  behavior: s.reducedMotion ? "auto" : "smooth",
                  block: "start",
                });
              }}
            >
              <Icon size={16} />
              <span>
                <strong>{title}</strong>
                <small>{sub}</small>
              </span>
            </a>
          ))}
        </div>
      </div>
      <fieldset
        className="secondary-controls plain-fieldset"
        disabled={s.compare || s.safety.active}
        aria-label="Additional study controls"
      >
        <Section
          title="People"
          icon={PersonStanding}
          badge={
            s.person
              ? "Person " + String(s.person.id).padStart(2, "0")
              : undefined
          }
        >
          <FloorPlan s={s} interactive />
          <label className="select-label">
            Selected occupant
            <select
              aria-label="Selected occupant"
              value={s.selected ?? ""}
              onChange={(e) => engine.select(Number(e.target.value))}
            >
              <option value="">Choose a person</option>
              {s.actors
                .filter((p) => p.inside)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    Person {String(p.id).padStart(2, "0")}
                  </option>
                ))}
            </select>
          </label>
          <p className="small-note">
            Click a figure in the room, then move them to a free position.
          </p>
          <div className="three-buttons">
            {[
              ["near", "Near window"],
              ["center", "Center"],
              ["rear", "Rear"],
            ].map(([zone, label]) => (
              <button
                key={zone}
                disabled={!s.person || s.compare || s.cameraInput.driving}
                onClick={() => engine.moveSelected(zone)}
                className={s.person?.zone === zone ? "active" : ""}
              >
                {label}
              </button>
            ))}
          </div>
          {s.person && (
            <p className="small-note">
              Current depth zone: {zoneLabel(s.person.zone)}
            </p>
          )}
        </Section>
        <Section title="Facade modules" icon={SlidersHorizontal}>
          {s.mode === "auto" && (
            <p className="small-note">
              Choose Manual to set each module independently.
            </p>
          )}
          {s.commands.map((command, i) => (
            <div
              key={i}
              className={
                "module-slider " + (s.selectedModule === i ? "selected" : "")
              }
            >
              <button
                className="module-select"
                aria-pressed={s.selectedModule === i}
                onClick={() => engine.change({ selectedModule: i })}
              >
                Select M0{i + 1}
              </button>
              <Range
                label={"Module 0" + (i + 1)}
                value={command}
                onChange={(value) => {
                  engine.change({ selectedModule: i });
                  engine.setOpening(value, i);
                }}
                disabled={s.mode !== "manual" || s.compare || s.safety.active}
                id={"module-" + i}
              />
              <p className="small-note">
                {s.metrics.explanations[i]} {s.pending[i] ? "Stabilizing…" : ""}
              </p>
            </div>
          ))}
          <p className="small-note">
            0% = flat screen. 100% = folded aside. Commands describe movement,
            not free area.
          </p>
          <button
            className="text-action"
            onClick={() => {
              engine.change({ perforation: !s.perforation });
              engine.setCamera("detail");
            }}
          >
            <Layers size={15} />
            {s.perforation ? "Hide" : "Show"} perforation logic
          </button>
        </Section>
        <Section title="Surroundings" icon={Trees}>
          <fieldset
            disabled={s.compare || s.safety.active}
            className="plain-fieldset"
          >
            <Toggle
              label="Trees"
              checked={s.surroundings.trees}
              onChange={(trees) => engine.setSurroundings({ trees })}
            />
            <Toggle
              label="Vehicles"
              checked={s.surroundings.vehicles}
              onChange={(vehicles) => engine.setSurroundings({ vehicles })}
            />
            <Toggle
              label="Exterior people"
              checked={s.surroundings.people}
              onChange={(people) => engine.setSurroundings({ people })}
            />
            <Range
              label="Exterior population"
              value={s.surroundings.population}
              max={8}
              suffix=""
              onChange={(population) => engine.setSurroundings({ population })}
              id="outside-population"
            />
            <Toggle
              label="Exterior motion"
              checked={s.surroundings.motion}
              onChange={(motion) => engine.setSurroundings({ motion })}
            />
            <label className="select-label">
              Interior lights
              <select
                aria-label="Interior lights"
                value={s.lightOverride}
                onChange={(e) =>
                  engine.change({ lightOverride: e.target.value })
                }
              >
                <option value="auto">Follow environment</option>
                <option value="on">Always on</option>
                <option value="off">Always off</option>
              </select>
            </label>
            <button
              className="text-action"
              onClick={() => engine.resetSurroundings()}
            >
              <RotateCcw size={14} />
              Reset surroundings
            </button>
          </fieldset>
        </Section>
        <Section title="Viewpoints" icon={Camera}>
          <CameraButtons s={s} all />
          <fieldset
            className="plain-fieldset"
            disabled={s.compare || s.safety.active}
          >
            <ObserverControls s={s} />
          </fieldset>
          <Toggle
            label="Plan inset"
            checked={s.planInset}
            onChange={(planInset) => engine.change({ planInset })}
          />
          <Toggle
            label="Model dimensions"
            checked={s.dimensions}
            onChange={(dimensions) => engine.change({ dimensions })}
          />
        </Section>
        <Section title="Analysis & design" icon={ScanEye}>
          <p className="small-note">
            Sampled line-of-sight visibility, not a measure of recognition or
            guaranteed privacy.
          </p>
          {s.exposure && (
            <div className="exposure-detail">
              <strong>{s.exposure.category} direct exposure</strong>
              <span>
                {s.exposure.clear} of {s.exposure.total} sampled paths are
                clear.
              </span>
            </div>
          )}
          <ThroughDay s={s} />
          <details className="nested-details">
            <summary>Proposed response table</summary>
            <table>
              <caption>Opening command (%)</caption>
              <thead>
                <tr>
                  <th>Light</th>
                  <th>Rear</th>
                  <th>Center</th>
                  <th>Near</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(BASELINES).map(([env, zones]) => (
                  <tr key={env}>
                    <th>{env}</th>
                    <td>{zones.rear}</td>
                    <td>{zones.center}</td>
                    <td>{zones.near}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="small-note">
              Prototype design assumptions. The most screening-demanding
              occupant sets each affected module.
            </p>
          </details>
          <details className="nested-details">
            <summary>Architectural intentions</summary>
            <ul>
              <li>Adjustable visual screening</li>
              <li>Filtered daylight and outside views</li>
              <li>Response to occupant positions</li>
              <li>Independent modules and user override</li>
            </ul>
            <p className="small-note">
              Perforations can still reveal light and fragments at night.
              Glazing is closed; this model makes no room ventilation claim.
            </p>
          </details>
        </Section>
        <Section title="Scenario presets" icon={Layers}>
          <div className="scenario-grid">
            {PRESETS.map(([key, label]) => (
              <button
                key={key}
                className={s.preset === key ? "active" : ""}
                onClick={() => engine.preset(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </Section>
        <Section title="Form development" icon={Layers}>
          <div className="form-list">
            {[
              "Flat screen",
              "Gradient perforation",
              "Folding geometry",
              "Independent modules",
              "Adaptive facade",
            ].map((label, i) => (
              <button
                key={i}
                className={s.form === i ? "active" : ""}
                onClick={() => engine.formStage(i)}
              >
                <span>{"0" + (i + 1)}</span>
                {label}
              </button>
            ))}
          </div>
          {s.form !== null && (
            <button
              className="text-action"
              onClick={() => engine.formStage(null)}
            >
              Return to model
            </button>
          )}
        </Section>
        <Section title="Display quality" icon={SlidersHorizontal}>
          <label className="select-label">
            Visual quality
            <select
              aria-label="Visual quality"
              value={s.quality}
              onChange={(e) => engine.change({ quality: e.target.value })}
            >
              <option value="auto">Auto</option>
              <option value="balanced">Balanced</option>
              <option value="high">High</option>
            </select>
          </label>
          <p className="small-note">
            Balanced reduces resolution and shadows for integrated graphics.
          </p>
          {s.fps && (
            <p className="small-note">
              Current browser: approximately {s.fps} frames/s
            </p>
          )}
          <Toggle
            label="Short camera transitions"
            checked={s.reducedMotion}
            onChange={(reducedMotion) => engine.change({ reducedMotion })}
          />
        </Section>
      </fieldset>
      <div className="control-footer">
        <span>MODEL SCALE</span>
        <p>
          {s.room.width} × {s.room.length} × {s.room.height} m room
          <br />
          {s.room.modules} modules · simulation estimates
        </p>
      </div>
    </aside>
  );
}
