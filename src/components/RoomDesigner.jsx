import { engine } from "../simulation/engine.js";
import { ROOM_PRESETS } from "../simulation/roomConfig.js";
import { Range } from "./Widgets.jsx";
export default function RoomDesigner({ s }) {
  const r = s.room,
    locked = !!(s.demo || s.compare || s.safety.active || s.form !== null);
  const set = (key, value) => engine.setRoom({ [key]: value });
  return (
    <fieldset className="plain-fieldset designer" disabled={locked}>
      <p className="small-note">
        Dimensions in metres. Openings and panels are constrained to fit the
        enclosure. The existing furniture layout is retained and fitted to each
        room preset.
      </p>
      <label className="select-label">
        Room preset
        <select
          aria-label="Room preset"
          value={r.preset}
          onChange={(e) => engine.roomPreset(e.target.value)}
        >
          <option value="custom" disabled>
            Custom room
          </option>
          {Object.entries(ROOM_PRESETS).map(([key, p]) => (
            <option key={key} value={key}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
      {[
        ["width", "Room width", 6, 14],
        ["length", "Room length", 5, 12],
        ["height", "Room height", 2.6, 4.8],
      ].map(([key, label, min, max]) => (
        <Range
          key={key}
          label={label}
          min={min}
          max={max}
          step={0.1}
          suffix=" m"
          value={r[key]}
          onChange={(v) => set(key, v)}
        />
      ))}
      <div className="field-pair">
        <label className="select-label">
          Wall finish
          <select
            value={r.wallMaterial}
            onChange={(e) => set("wallMaterial", e.target.value)}
          >
            <option value="plaster">Plaster</option>
            <option value="concrete">Concrete</option>
            <option value="timber">Timber finish</option>
          </select>
        </label>
        <label className="select-label">
          Floor finish
          <select
            value={r.floorMaterial}
            onChange={(e) => set("floorMaterial", e.target.value)}
          >
            <option value="stone">Stone</option>
            <option value="concrete">Concrete</option>
            <option value="timber">Timber</option>
          </select>
        </label>
      </div>
      <label className="color-field">
        Wall color
        <input
          type="color"
          aria-label="Wall color"
          value={r.wallColor}
          onChange={(e) => set("wallColor", e.target.value)}
        />
        <span>{r.wallColor}</span>
      </label>
      <label className="select-label">
        Facade modules
        <select
          aria-label="Number of facade modules"
          value={r.modules}
          onChange={(e) => set("modules", Number(e.target.value))}
        >
          {[2, 3, 4].map((n) => (
            <option key={n} value={n}>
              {n} independent modules
            </option>
          ))}
        </select>
      </label>
      <Range
        label="Window width"
        min={r.modules * 0.9}
        max={Math.min(r.width - 1, r.modules * 2.5)}
        step={0.05}
        suffix=" m"
        value={r.windowWidth}
        onChange={(v) => set("windowWidth", v)}
      />
      <Range
        label="Window height"
        min={1.1}
        max={r.height - r.sill - 0.25}
        step={0.01}
        suffix=" m"
        value={r.windowHeight}
        onChange={(v) => set("windowHeight", v)}
      />
      <Range
        label="Window sill height"
        min={0.2}
        max={r.height - 1.5}
        step={0.01}
        suffix=" m"
        value={r.sill}
        onChange={(v) => set("sill", v)}
      />
      <Range
        label="Opening position: left / right"
        min={-(r.width - r.windowWidth) / 2 + 0.3}
        max={(r.width - r.windowWidth) / 2 - 0.3}
        step={0.05}
        suffix=" m"
        value={r.offset}
        onChange={(v) => set("offset", v)}
      />
      <Range
        label="Panel pair width (closed)"
        min={0.7}
        max={r.windowWidth / r.modules - 0.07}
        step={0.01}
        suffix=" m"
        value={r.panelWidth}
        onChange={(v) => set("panelWidth", v)}
      />
      <Range
        label="Panel height"
        min={0.9}
        max={r.windowHeight - 0.08}
        step={0.01}
        suffix=" m"
        value={r.panelHeight}
        onChange={(v) => set("panelHeight", v)}
      />
      <p className="small-note">
        Two rigid leaves per module, each {(r.panelWidth / 2).toFixed(2)} m
        wide. Smaller panels leave permanent gaps.
      </p>
      <div className="two-buttons">
        <button onClick={() => engine.saveRoom()}>Save room</button>
        <button onClick={() => engine.loadRoom()}>Restore saved</button>
      </div>
      <button
        className="text-action"
        onClick={() => engine.roomPreset("original")}
      >
        Reset to original room
      </button>
      {locked && (
        <p className="small-note">
          Exit the temporary view or override to edit the room.
        </p>
      )}
    </fieldset>
  );
}
