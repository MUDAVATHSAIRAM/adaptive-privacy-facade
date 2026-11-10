import { engine } from "../simulation/engine.js";
import FloorPlan from "./FloorPlan.jsx";
export default function Dashboard({ s }) {
  const metrics = s.metrics;
  const status = s.safety.active
    ? "Safety demonstration"
    : s.compare || s.demo?.paused
      ? "Paused study"
      : s.pending.some(Boolean)
        ? "Stabilizing input"
        : s.actualCommands.some((c, i) => Math.abs(c - s.commands[i]) > 0.5)
          ? "Panels moving"
          : "Stable";
  return (
    <div className="performance-dashboard">
      <div className="dashboard-heading">
        <span className="status-badge">{status}</span>
        <span className="estimate-tag">Simulation estimates</span>
      </div>
      <div className="metric-grid">
        <div>
          <strong>{metrics.controlCount}</strong>
          <span>
            {s.cameraInput.driving ? "Detected people" : "Indoor occupants"}
          </span>
        </div>
        <div>
          <strong>
            {metrics.exposure === null ? "N/A" : `${metrics.exposure}%`}
          </strong>
          <span>Exposure index</span>
        </div>
        <div>
          <strong>{metrics.freeOpening.toFixed(0)}%</strong>
          <span>Projected clear opening</span>
        </div>
        <div>
          <strong>
            {s.selectedModule === null ? "—" : `M0${s.selectedModule + 1}`}
          </strong>
          <span>Selected module</span>
        </div>
      </div>
      <p className="small-note">
        {s.environment} ·{" "}
        {s.safety.active
          ? "safety override"
          : s.mode === "auto"
            ? "automatic control"
            : "manual control"}{" "}
        · {s.cameraInput.driving ? "image zoning" : "simulated positions"}
      </p>
      <div className="module-dashboard">
        {s.commands.map((command, i) => (
          <button
            key={i}
            className={s.selectedModule === i ? "active" : ""}
            onClick={() => engine.change({ selectedModule: i })}
          >
            <span>
              <b>M0{i + 1}</b>
              <strong>{Math.round(command)}%</strong>
            </span>
            <span className="dashboard-track">
              <i style={{ width: `${s.actualCommands[i]}%` }} />
            </span>
            <small>
              Current {Math.round(s.actualCommands[i])}% → target{" "}
              {Math.round(command)}% ·{" "}
              {s.hardware.modules[i].targetServoDegrees}° servo
            </small>
            <small>
              {metrics.explanations[i]} {s.pending[i] ? "Stability delay…" : ""}
            </small>
          </button>
        ))}
      </div>
      <details className="nested-details" open>
        <summary>Open / adaptive / closed</summary>
        <p className="small-note">
          Same occupants and lighting; different hypothetical openings.
        </p>
        {metrics.comparison.map((row) => (
          <div key={row.label} className="comparison-row">
            <strong>{row.label}</strong>
            <div>
              <span style={{ width: `${row.opening}%` }} />
            </div>
            <span>{row.opening.toFixed(0)}%</span>
            <small>
              Exposure index:{" "}
              {row.exposure === null ? "N/A" : `${row.exposure}%`}
            </small>
          </div>
        ))}
        <p className="small-note">
          Bars show projected clear area outside panel leaves. More opening
          preserves views but can increase exposure. Perforations and frame
          losses are excluded from this area estimate; a closed screen is not
          fully opaque.
        </p>
      </details>
      <FloorPlan s={s} interactive />
      <details className="nested-details">
        <summary>Occupant coordinates</summary>
        {s.positions.length ? (
          <ul className="position-list">
            {s.positions.map((p) => (
              <li key={p.id}>
                P{p.id}: x {p.x.toFixed(2)} m, depth {p.z.toFixed(2)} m
              </li>
            ))}
          </ul>
        ) : (
          <p className="small-note">No simulated occupants inside.</p>
        )}
      </details>
      <details className="nested-details">
        <summary>How estimates are calculated</summary>
        <p className="small-note">
          Opening area uses panel dimensions and the cosine of the fold angle.
          Exposure averages affected zones with an assumed perforation floor and
          lighting weight. It is a teaching index, not a measured probability.
          Privacy Analysis separately traces five actual mesh sightlines to the
          selected occupant. No lux, energy savings or verified privacy
          performance is claimed.
        </p>
      </details>
    </div>
  );
}
