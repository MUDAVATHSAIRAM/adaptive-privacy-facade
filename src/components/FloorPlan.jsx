import { useRef } from "react";
import { engine } from "../simulation/engine.js";
import { facadeLayout } from "../simulation/roomConfig.js";
import { furniture } from "../simulation/navigation.js";
import { hingeCoordinates } from "../simulation/kinematics.js";
export default function FloorPlan({ s, interactive = false }) {
  const ref = useRef(),
    r = s.room,
    scale = Math.min(250 / r.width, 190 / r.length);
  const x = (value) => 150 + value * scale,
    y = (value) => 48 + value * scale;
  const move = (e) => {
    if (!interactive || s.compare || s.cameraInput.driving || !s.person) return;
    const point = ref.current.createSVGPoint();
    point.x = e.clientX;
    point.y = e.clientY;
    const p = point.matrixTransform(ref.current.getScreenCTM().inverse());
    engine.moveSelectedTo((p.x - 150) / scale, (p.y - 48) / scale);
  };
  return (
    <div className="floor-plan">
      <svg
        ref={ref}
        viewBox={`0 0 300 ${Math.ceil(y(r.length) + 25)}`}
        role="img"
        aria-label="Floor plan. Select an occupant, then click a clear floor position to move."
        onClick={move}
      >
        <rect
          x={x(-r.width / 2)}
          y={y(0)}
          width={r.width * scale}
          height={r.length * scale}
          fill="#ece9df"
          stroke="#68776e"
          strokeWidth="2"
        />
        {facadeLayout(r).map((l) => {
          const h = hingeCoordinates(
            s.actualCommands[l.index],
            r.panelWidth / 2,
          );
          return (
            <g key={l.index}>
              <rect
                x={x(l.left)}
                y={y(0)}
                width={l.pitch * scale}
                height={r.length * scale}
                fill="#aa734c"
                opacity={s.metrics.affected[l.index].length ? 0.13 : 0.025}
              />
              <text
                x={x(l.center)}
                y="20"
                textAnchor="middle"
                fontSize="10"
                fill="#785236"
              >
                M0{l.index + 1}
              </text>
              <polyline
                points={[
                  [l.start, -0.34],
                  [l.start + h.middle[0], -0.34 + h.middle[1]],
                  [l.start + h.free[0], -0.34],
                ]
                  .map(([a, b]) => `${x(a)},${y(b)}`)
                  .join(" ")}
                fill="none"
                stroke="#9a6846"
                strokeWidth="2.5"
              />
            </g>
          );
        })}
        {[2.7 / 8, 5.15 / 8].map((k) => (
          <line
            key={k}
            x1={x(-r.width / 2)}
            x2={x(r.width / 2)}
            y1={y(r.length * k)}
            y2={y(r.length * k)}
            stroke="#adb5a9"
            strokeDasharray="4 4"
          />
        ))}
        {furniture(r).map((o, i) => (
          <rect
            key={i}
            x={x(o.x - o.w / 2)}
            y={y(o.z - o.d / 2)}
            width={o.w * scale}
            height={o.d * scale}
            fill="#b7b7a8"
            stroke="#929a8b"
            rx="2"
          />
        ))}
        {s.positions.map((p) => (
          <g
            key={p.id}
            onClick={(e) => {
              e.stopPropagation();
              engine.select(p.id);
            }}
            role={interactive ? "button" : undefined}
            tabIndex={interactive ? 0 : undefined}
            aria-label={`Select person ${p.id}`}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                engine.select(p.id);
              }
            }}
            className="plan-person"
          >
            <circle
              cx={x(p.x)}
              cy={y(p.z)}
              r={p.id === s.selected ? 7 : 5.5}
              fill={p.id === s.selected ? "#a46c49" : "#607d70"}
              stroke="#faf9f5"
              strokeWidth="1.5"
            />
            {interactive && (
              <text
                x={x(p.x)}
                y={y(p.z) - 9}
                textAnchor="middle"
                fontSize="9"
                fill="#44574a"
              >
                {p.id}
              </text>
            )}
          </g>
        ))}
        {s.cameraInput.driving &&
          s.cameraInput.detections.map((p, i) => (
            <circle
              key={i}
              cx={x(r.offset + (p.u - 0.5) * r.windowWidth)}
              cy={y(r.length * 0.4)}
              r="8"
              fill="none"
              stroke="#a46c49"
              strokeDasharray="3 2"
            />
          ))}
        <text
          x="150"
          y={y(r.length) + 18}
          textAnchor="middle"
          fontSize="10"
          fill="#68776e"
        >
          {r.width.toFixed(1)} × {r.length.toFixed(1)} m · front facade above
        </text>
      </svg>
      {interactive && (
        <p className="small-note">
          {s.cameraInput.driving
            ? "Dashed markers represent image zones at an assumed depth; no 3D tracking."
            : s.person
              ? "Click a clear floor position to move the selected person. Shaded zones need screening."
              : "Add a person, then select their numbered marker."}
        </p>
      )}
      {interactive && s.person && !s.cameraInput.driving && (
        <div className="two-buttons">
          <button
            onClick={() => engine.moveSelectedTo(s.person.x - 0.65, s.person.z)}
          >
            Move left
          </button>
          <button
            onClick={() => engine.moveSelectedTo(s.person.x + 0.65, s.person.z)}
          >
            Move right
          </button>
        </div>
      )}
    </div>
  );
}
