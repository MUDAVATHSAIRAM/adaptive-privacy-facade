import { useMemo, useRef, useLayoutEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { engine } from "../simulation/engine.js";
import { materials, geometries } from "./materials.js";
import { Box, Cylinder } from "./primitives.jsx";

const TREES = [
  [-7, -2, 1.05],
  [7, -2, 0.94],
  [-9, -6, 1.08],
  [9, -15, 1.12],
  [-6, -16, 1],
  [10, 6, 1.08],
];
const temp = new THREE.Object3D();
function StreetLight({ x }) {
  const light = useRef();
  useFrame(() => {
    light.current.intensity = engine.state.lightMix * 6.5;
  });
  return (
    <pointLight
      ref={light}
      position={[x, 3.5, -6.55]}
      color="#ffe0ae"
      intensity={0}
      distance={10}
      decay={2}
    />
  );
}
function Trees() {
  const foliage = useRef(),
    trunks = useRef();
  useLayoutEffect(() => {
    TREES.forEach(([x, z, k], i) => {
      temp.position.set(x, 1.65 * k, z);
      temp.rotation.set(0, 0, 0.025 * (i % 2 ? 1 : -1));
      temp.scale.set(0.17 * k, 3.3 * k, 0.17 * k);
      temp.updateMatrix();
      trunks.current.setMatrixAt(i, temp.matrix);
    });
    trunks.current.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < 36; i++)
      foliage.current.setColorAt(
        i,
        new THREE.Color(i % 3 ? "#73855f" : "#657752"),
      );
  }, []);
  useFrame(() => {
    TREES.forEach(([x, z, k], i) => {
      for (let j = 0; j < 6; j++) {
        const a = j * 2.399 + i,
          wind = Math.sin(engine.state.exteriorTime * 0.42 + i) * 0.025;
        temp.position.set(
          x + Math.cos(a) * 0.8 * k + wind,
          (3.7 + (j % 3) * 0.55) * k,
          z + Math.sin(a) * 0.8 * k,
        );
        temp.rotation.set(0.3 * j, a + wind, 0.2 * j);
        temp.scale.set(1.05 * k, 1.3 * k, 1.1 * k);
        temp.updateMatrix();
        foliage.current.setMatrixAt(i * 6 + j, temp.matrix);
      }
    });
    foliage.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <group>
      <instancedMesh
        ref={trunks}
        args={[geometries.cylinder, materials.bark, 6]}
        castShadow
        receiveShadow
        userData={{ obstruction: "landscape" }}
      />
      <instancedMesh
        ref={foliage}
        args={[geometries.foliage, materials.foliage, 36]}
        castShadow
        receiveShadow
        userData={{ obstruction: "landscape" }}
      />
    </group>
  );
}
function Bench({ position }) {
  return (
    <group position={position}>
      {[0, 1, 2, 3].map((i) => (
        <Box
          key={i}
          position={[0, 0.47, -0.24 + i * 0.145]}
          size={[2.2, 0.075, 0.12]}
          material="timber"
          obstruction="landscape"
        />
      ))}
      <Box
        position={[0, 0.86, 0.24]}
        size={[2.2, 0.3, 0.055]}
        material="timber"
        obstruction="landscape"
      />
      {[-0.82, 0.82].map((x) => (
        <Box
          key={x}
          position={[x, 0.23, 0]}
          size={[0.08, 0.46, 0.52]}
          material="charcoal"
          obstruction="landscape"
        />
      ))}
    </group>
  );
}
function Car({ x, z, color, moving = false, reverse = false }) {
  const root = useRef();
  const paint = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.4,
        metalness: 0.35,
      }),
    [color],
  );
  const glass = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#4f6266",
        roughness: 0.25,
        metalness: 0.4,
      }),
    [],
  );
  useFrame(() => {
    if (moving)
      root.current.position.x =
        ((x + (reverse ? -1 : 1) * engine.state.exteriorTime * 1.45 + 2000) %
          44) -
        22;
  });
  return (
    <group
      ref={root}
      position={[x, 0, z]}
      rotation={[0, reverse ? Math.PI : 0, 0]}
    >
      <Box
        position={[0, 0.6, 0]}
        size={[3.8, 0.44, 1.68]}
        material={paint}
        obstruction="vehicle"
      />
      <Box
        position={[-0.18, 0.98, 0]}
        size={[2, 0.55, 1.44]}
        material={glass}
        obstruction="vehicle"
      />
      <Box
        position={[-0.2, 1.27, 0]}
        size={[1.9, 0.06, 1.45]}
        material={paint}
        obstruction="vehicle"
      />
      <Box
        position={[1.23, 0.84, 0]}
        size={[1.08, 0.09, 1.58]}
        material={paint}
        obstruction="vehicle"
      />
      <Box
        position={[-1.45, 0.84, 0]}
        size={[0.68, 0.1, 1.6]}
        material={paint}
        obstruction="vehicle"
      />
      {[-1.18, 1.18].flatMap((wx) =>
        [-0.83, 0.83].map((wz) => (
          <group key={wx + ":" + wz}>
            <Cylinder
              position={[wx, 0.31, wz]}
              size={[0.29, 0.18, 0.29]}
              rotation={[Math.PI / 2, 0, 0]}
              material="tyre"
              obstruction="vehicle"
            />
            <Cylinder
              position={[wx, 0.31, wz * 1.12]}
              size={[0.15, 0.015, 0.15]}
              rotation={[Math.PI / 2, 0, 0]}
              material="chrome"
              obstruction="vehicle"
            />
          </group>
        )),
      )}
      {[-0.55, 0.55].map((wz) => (
        <group key={wz}>
          <mesh
            position={[1.91, 0.66, wz]}
            scale={[0.018, 0.12, 0.3]}
            geometry={geometries.box}
          >
            <meshStandardMaterial
              color="#fff2c8"
              emissive="#ffe2a1"
              emissiveIntensity={1.1}
            />
          </mesh>
          <mesh
            position={[-1.91, 0.66, wz]}
            scale={[0.018, 0.12, 0.27]}
            geometry={geometries.box}
          >
            <meshStandardMaterial
              color="#9e4835"
              emissive="#e77448"
              emissiveIntensity={0.45}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
function PavingLines() {
  const geometry = useMemo(() => {
    const points = [];
    for (let x = -12; x <= 12; x += 1.5)
      points.push(x, 0.026, -7.8, x, 0.026, -0.55);
    for (let z = -7.8; z <= -0.55; z += 1.5)
      points.push(-12, 0.026, z, 12, 0.026, z);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
    return g;
  }, []);
  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color="#8f958a" transparent opacity={0.23} />
    </lineSegments>
  );
}
export default function Surroundings({ s }) {
  return (
    <group>
      <Box
        position={[0, -0.17, -3]}
        size={[58, 0.25, 54]}
        material="grass"
        obstruction="ground"
        receiveShadow
      />
      <Box
        position={[0, -0.035, -3.4]}
        size={[24, 0.1, 8.8]}
        material="paving"
        obstruction="ground"
      />
      <Box
        position={[6.8, -0.015, 5]}
        size={[3.4, 0.1, 10]}
        material="paving"
        obstruction="ground"
      />
      <PavingLines />
      <Box
        position={[0, -0.035, -11]}
        size={[52, 0.1, 6.25]}
        material="road"
        obstruction="ground"
      />
      <Box
        position={[0, 0.025, -7.9]}
        size={[52, 0.16, 0.15]}
        material="concrete"
        obstruction="ground"
      />
      <Box
        position={[0, 0.025, -14.1]}
        size={[52, 0.16, 0.15]}
        material="concrete"
        obstruction="ground"
      />
      {Array.from({ length: 12 }, (_, i) => (
        <Box
          key={i}
          position={[-23 + i * 4, 0.021, -11]}
          size={[2, 0.008, 0.065]}
          material="paper"
          obstruction={null}
        />
      ))}
      {[-7, 7].map((x) => (
        <group key={x}>
          <Box
            position={[x, 0.035, -1.35]}
            size={[3.2, 0.13, 3.6]}
            material="concrete"
            obstruction="landscape"
          />
          <Box
            position={[x, 0.11, -1.35]}
            size={[3, 0.025, 3.4]}
            material="grass"
            obstruction="landscape"
          />
          <Bench position={[x, 0.02, -6.6]} />
          <Cylinder
            position={[x, 1.9, -6.7]}
            size={[0.047, 3.8, 0.047]}
            material="charcoal"
            obstruction="landscape"
          />
          <Box
            position={[x, 3.85, -6.55]}
            size={[0.65, 0.08, 0.45]}
            material="charcoal"
            obstruction="landscape"
          />
          <StreetLight x={x} />
        </group>
      ))}
      {s.surroundings.trees && <Trees />}
      {s.surroundings.vehicles && (
        <group>
          <Car x={-7.7} z={-8.95} color="#ece8df" />
          <Car x={5.8} z={-8.95} color="#879494" />
          <Car x={1} z={-10.3} color="#a98662" moving />
          <Car x={16} z={-12.65} color="#8e9993" moving reverse />
        </group>
      )}
      {/* Quiet neighbouring masses give the street depth without becoming the subject. */}
      {[
        [-15, 5, -22, 8, 10, 7],
        [-4, 3, -24, 10, 6, 5],
        [9, 4, -24, 9, 8, 7],
        [19, 2.5, -18, 6, 5, 6],
      ].map(([x, y, z, w, h, d], i) => (
        <group key={i}>
          <Box
            position={[x, y - 0.04, z]}
            size={[w, h, d]}
            material="plaster"
            obstruction="room"
          />
          {[0.35, 0.65].map((k) => (
            <Box
              key={k}
              position={[x, h * k, z + d / 2 + 0.01]}
              size={[w * 0.78, 0.65, 0.02]}
              material="paving"
              obstruction="room"
            />
          ))}
        </group>
      ))}
    </group>
  );
}
