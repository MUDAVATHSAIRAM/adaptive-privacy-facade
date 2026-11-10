import { Html, Line } from "@react-three/drei";
import { Box, Cylinder, Plant } from "./primitives.jsx";
import { materials } from "./materials.js";
import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  facadeLayout,
  furnitureScale,
  roomPoint,
} from "../simulation/roomConfig.js";
import { engine } from "../simulation/engine.js";

function LightStrip({ x, room }) {
  const material = useRef();
  useFrame(() => {
    const { lightOverride, lightMix } = engine.state;
    material.current.emissiveIntensity =
      lightOverride === "off"
        ? 0
        : lightOverride === "on"
          ? 1.4
          : lightMix * 0.7;
  });
  return (
    <mesh
      position={[x, room.height + 0.01, room.length / 2]}
      rotation={[Math.PI / 2, 0, 0]}
    >
      <planeGeometry args={[0.055, room.length * 0.5875]} />
      <meshStandardMaterial
        ref={material}
        color="#e0e1d7"
        emissive="#ffdfa9"
        roughness={0.5}
      />
    </mesh>
  );
}

function Desk({ z, room }) {
  const [x, depth] = roomPoint(-4.25, z, room);
  return (
    <group position={[x, 0.12, depth]} scale={furnitureScale(room)}>
      <Box
        position={[0, 0.75, 0]}
        size={[0.95, 0.055, 1.7]}
        material="timber"
      />
      {[-0.36, 0.36].flatMap((x) =>
        [-0.7, 0.7].map((z) => (
          <Box
            key={x + ":" + z}
            position={[x, 0.36, z]}
            size={[0.04, 0.72, 0.04]}
            material="charcoal"
          />
        )),
      )}
      <Box
        position={[0.05, 0.79, -0.28]}
        size={[0.4, 0.035, 0.3]}
        material="paper"
      />
      <Box
        position={[-0.1, 0.79, 0.29]}
        size={[0.28, 0.035, 0.36]}
        material="paper"
      />
      <Cylinder
        position={[-0.1, 0.845, 0.56]}
        size={[0.048, 0.12, 0.048]}
        material="plaster"
      />
      <group position={[0.9, 0, 0]}>
        <Box
          position={[0, 0.47, 0]}
          size={[0.56, 0.075, 0.55]}
          material="fabric"
        />
        <Box
          position={[0.27, 0.72, 0]}
          size={[0.05, 0.5, 0.57]}
          material="timber"
        />
        {[-0.2, 0.2].flatMap((x) =>
          [-0.2, 0.2].map((z) => (
            <Box
              key={x + ":" + z}
              position={[x, 0.235, z]}
              size={[0.028, 0.47, 0.028]}
              material="charcoal"
            />
          )),
        )}
      </group>
    </group>
  );
}
export default function Room({ s }) {
  const r = s.room,
    w = r.width,
    d = r.length,
    h = r.height;
  const cut = ["perspective", "plan", "section"].includes(s.camera);
  const section = s.camera === "section",
    layouts = facadeLayout(r);
  const left = r.offset - r.windowWidth / 2,
    right = r.offset + r.windowWidth / 2;
  const top = r.sill + r.windowHeight,
    doorZ = (d * 6.75) / 8;
  const doorStart = (d * 6.1) / 8,
    doorEnd = (d * 7.5) / 8;
  const doorHeight = Math.min(2.72, h - 0.45);
  const k = furnitureScale(r);
  const wall = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: r.wallColor,
        roughness: { plaster: 0.91, concrete: 1, timber: 0.68 }[r.wallMaterial],
      }),
    [r.wallColor, r.wallMaterial],
  );
  const floor = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: { stone: "#ded9cc", concrete: "#b9b7b0", timber: "#aa8964" }[
          r.floorMaterial
        ],
        roughness: r.floorMaterial === "concrete" ? 1 : 0.8,
      }),
    [r.floorMaterial],
  );
  useEffect(
    () => () => {
      wall.dispose();
    },
    [wall],
  );
  useEffect(
    () => () => {
      floor.dispose();
    },
    [floor],
  );
  return (
    <group>
      <Box
        position={[0, 0.01, d / 2]}
        size={[w + 0.36, 0.22, d + 0.36]}
        material="concrete"
      />
      <Box position={[0, 0.125, d / 2]} size={[w, 0.025, d]} material={floor} />
      {r.floorMaterial === "timber" &&
        Array.from({ length: Math.floor(w / 0.25) }, (_, i) => (
          <Box
            key={i}
            position={[-w / 2 + (i + 1) * 0.25, 0.14, d / 2]}
            size={[0.006, 0.002, d]}
            material="timber"
            obstruction={null}
            castShadow={false}
          />
        ))}
      <Box
        position={[w / 2 + 0.65, 0.035, doorZ]}
        size={[1.3, 0.1, doorEnd - doorStart]}
        material="paving"
        rotation={[0, 0, -0.092]}
      />
      <Box
        position={[-w / 2, 0.12 + h / 2, d / 2]}
        size={[0.2, h, d + 0.2]}
        material={wall}
      />
      {r.wallMaterial === "timber" &&
        Array.from({ length: Math.floor(d / 0.24) }, (_, i) => (
          <Box
            key={i}
            position={[-w / 2 + 0.102, 0.12 + h / 2, (i + 1) * 0.24]}
            size={[0.002, h, 0.007]}
            material="timber"
            obstruction={null}
            castShadow={false}
          />
        ))}
      <Box
        position={[0, cut ? 0.47 : 0.12 + h / 2, d]}
        size={[w, cut ? 0.7 : h, 0.2]}
        material={wall}
      />
      {!section && (
        <>
          <Box
            position={[w / 2, cut ? 0.27 : 0.12 + h / 2, doorStart / 2]}
            size={[0.2, cut ? 0.3 : h, doorStart]}
            material={wall}
          />
          <Box
            position={[w / 2, cut ? 0.27 : 0.12 + h / 2, (doorEnd + d) / 2]}
            size={[0.2, cut ? 0.3 : h, d - doorEnd]}
            material={wall}
          />
          {!cut && (
            <Box
              position={[
                w / 2,
                0.12 + doorHeight + (h - doorHeight) / 2,
                (doorStart + doorEnd) / 2,
              ]}
              size={[0.2, h - doorHeight, doorEnd - doorStart]}
              material={wall}
            />
          )}
          {[doorStart, doorEnd].map((z) => (
            <Box
              key={z}
              position={[w / 2, 0.12 + doorHeight / 2, z]}
              size={[0.24, doorHeight, 0.08]}
              material="timber"
            />
          ))}
          <Box
            position={[w / 2, 0.12 + doorHeight, (doorStart + doorEnd) / 2]}
            size={[0.24, 0.08, doorEnd - doorStart + 0.06]}
            material="timber"
          />
          <Box
            position={[
              w / 2 + (doorEnd - doorStart) * 0.45,
              0.12 + doorHeight / 2,
              doorEnd - 0.05,
            ]}
            size={[(doorEnd - doorStart) * 0.9, doorHeight - 0.09, 0.055]}
            material="timber"
          />
        </>
      )}
      {!cut && (
        <Box
          position={[0, h + 0.17, d / 2]}
          size={[w + 0.35, 0.12, d + 0.35]}
          material={wall}
        />
      )}
      <Box
        position={[0, (top + h + 0.17) / 2, 0]}
        size={[w + 0.3, h + 0.17 - top, 0.32]}
        material={wall}
      />
      <Box
        position={[(-w / 2 + left) / 2 - 0.05, (r.sill + top) / 2, 0]}
        size={[left + w / 2 + 0.1, r.windowHeight, 0.25]}
        material={wall}
      />
      <Box
        position={[(w / 2 + right) / 2 + 0.05, (r.sill + top) / 2, 0]}
        size={[w / 2 - right + 0.1, r.windowHeight, 0.25]}
        material={wall}
      />
      <Box
        position={[0, r.sill / 2, 0]}
        size={[w, r.sill, 0.31]}
        material={wall}
      />
      {layouts.map((l) => (
        <Box
          key={l.index}
          position={[l.center, r.sill + r.windowHeight / 2, 0]}
          size={[l.pitch - 0.04, r.windowHeight, 0.014]}
          material={materials.glass}
          obstruction={null}
          castShadow={false}
        />
      ))}
      {[...layouts.map((l) => l.left), right].map((x) => (
        <Box
          key={x}
          position={[x, r.sill + r.windowHeight / 2, 0]}
          size={[0.04, r.windowHeight + 0.04, 0.065]}
          material="charcoal"
          obstruction="frame"
        />
      ))}
      <Box
        position={[r.offset, top, 0]}
        size={[r.windowWidth + 0.05, 0.06, 0.075]}
        material="charcoal"
        obstruction="frame"
      />
      <Desk z={3.6} room={r} />
      <Desk z={5.65} room={r} />
      <group position={[(-0.4 * w) / 10, 0.12, (7.4 * d) / 8]} scale={k}>
        <Box
          position={[0, 0.31, 0]}
          size={[3.2, 0.45, 0.65]}
          material="fabric"
        />
        <Box
          position={[0, 0.73, 0.24]}
          size={[3.2, 0.42, 0.15]}
          material="fabric"
        />
        {[-1.35, 1.35].map((x) => (
          <Box
            key={x}
            position={[x, 0.09, 0]}
            size={[0.07, 0.18, 0.5]}
            material="charcoal"
          />
        ))}
      </group>
      <Plant
        position={[(-4.35 * w) / 10, 0.14, (0.7 * d) / 8]}
        scale={0.8 * k}
      />
      <Plant
        position={[(4.35 * w) / 10, 0.14, (0.75 * d) / 8]}
        scale={0.8 * k}
      />
      {!cut &&
        [-0.26 * w, 0, 0.26 * w].map((x) => (
          <group key={x}>
            <Box
              position={[x, h + 0.05, d / 2]}
              size={[0.075, 0.05, d * 0.6]}
              material="charcoal"
            />
            <LightStrip x={x} room={r} />
          </group>
        ))}
      {s.dimensions && (
        <group>
          <Line
            points={[
              [-w / 2, 0.16, d + 0.6],
              [w / 2, 0.16, d + 0.6],
            ]}
            color="#6c7069"
            lineWidth={1}
          />
          <Line
            points={[
              [w / 2 + 0.7, 0.14, 0],
              [w / 2 + 0.7, 0.14, d],
            ]}
            color="#6c7069"
            lineWidth={1}
          />
          <Html position={[0, 0.18, d + 0.6]} center>
            <span className="dimension">{w.toFixed(1)} m</span>
          </Html>
          <Html position={[w / 2 + 0.7, 0.18, d / 2]} center>
            <span className="dimension">{d.toFixed(1)} m room depth</span>
          </Html>
          <Html position={[-w / 2 + 0.5, h + 0.2, 0]} center>
            <span className="dimension">{h.toFixed(1)} m height</span>
          </Html>
        </group>
      )}
      {s.camera === "section" && (
        <group>
          <Line
            points={[
              [-w / 2 + 0.2, 1.76, -7],
              [-w / 2 + 0.2, 1.76, d - 1],
            ]}
            dashed
            dashSize={0.18}
            gapSize={0.15}
            color="#a16d4d"
            lineWidth={1}
          />
          <Html position={[-w / 2 + 0.2, 1.8, d * 0.7]} center>
            <span className="dimension">Standing eye level · 1.6 m</span>
          </Html>
          <Html position={[-w / 2 + 0.1, h - 0.5, -0.2]} center>
            <span className="dimension">Glazing / external folding screen</span>
          </Html>
        </group>
      )}
    </group>
  );
}
