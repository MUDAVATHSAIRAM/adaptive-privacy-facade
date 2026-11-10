import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Line, Html } from "@react-three/drei";
import { engine } from "../simulation/engine.js";
import { facadeLayout } from "../simulation/roomConfig.js";
import { traceVisibility } from "../simulation/visibility.js";
export default function Analysis({ s }) {
  const time = useRef(0);
  useFrame(({ scene }, dt) => {
    time.current += dt;
    if (time.current < 0.3) return;
    time.current = 0;
    const state = engine.state;
    if (!state.analysis || state.compare) {
      state.exposure = null;
      state.sightResults = [];
      return;
    }
    const p = state.actors.find((p) => p.id === state.selected && p.inside);
    if (!p) {
      state.exposure = null;
      state.sightResults = [];
      return;
    }
    scene.updateMatrixWorld(true);
    const origin = [state.observer.x, 1.65, state.observer.z],
      k = p.height;
    const samples = [
      [0, 1.57],
      [-0.08, 1.55],
      [0.08, 1.55],
      [-0.12, 1.15],
      [0.12, 1.15],
    ];
    const lines = samples.map(([dx, y]) =>
      traceVisibility(scene, origin, [p.x + dx * k, 0.145 + y * k, p.z]),
    );
    const clear = lines.filter((l) => l.clear).length;
    state.sightResults = lines;
    state.exposure = {
      category: clear >= 3 ? "High" : clear > 0 ? "Medium" : "Low",
      clear,
      total: 5,
      blockers: [
        ...new Set(lines.filter((l) => !l.clear).map((l) => l.obstruction)),
      ],
    };
  });
  if (!s.analysis || s.compare) return null;
  return (
    <group>
      {facadeLayout(s.room)
        .filter((l) => s.metrics.affected[l.index].length)
        .map((l) => (
          <mesh
            key={l.index}
            position={[l.center, 0.15, s.room.length / 2]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <planeGeometry args={[l.pitch - 0.05, s.room.length - 0.15]} />
            <meshBasicMaterial
              color="#b17a4d"
              transparent
              opacity={0.08}
              depthWrite={false}
            />
          </mesh>
        ))}
      {s.sightResults.map((line, i) => (
        <group key={i}>
          <Line
            points={[line.start, line.end]}
            color={line.clear ? "#c28d46" : "#7b8689"}
            lineWidth={1.5}
            transparent
            opacity={0.92}
          />
          {!line.clear && (
            <mesh position={line.end}>
              <sphereGeometry args={[0.045, 8, 6]} />
              <meshBasicMaterial color="#717c7e" />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}
export function PerforationLabels({ s }) {
  if (!s.perforation || s.compare) return null;
  return (
    <group
      position={[s.room.offset, s.room.sill - 0.33, 0]}
      scale={[s.room.windowWidth / 8, s.room.windowHeight / 2.96, 1]}
    >
      {[
        [2.88, "HEAD ZONE", "Larger openings · filtered views"],
        [1.81, "EYE ZONE", "Smaller openings · stronger screening"],
        [0.82, "LOWER ZONE", "Medium openings · ground-level views"],
      ].map(([y, title, caption]) => (
        <group key={title}>
          <Line
            points={[
              [-1.8, y, -0.39],
              [-0.55, y, -1.6],
              [1.35, y, -1.6],
            ]}
            color="#6f7067"
            lineWidth={1}
          />
          <Html
            position={[1.4, y, -1.6]}
            center
            style={{ pointerEvents: "none" }}
          >
            <span className="leader-label">
              <strong>{title}</strong>
              <span>{caption}</span>
            </span>
          </Html>
        </group>
      ))}
    </group>
  );
}
