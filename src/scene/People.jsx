import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { engine } from "../simulation/engine.js";
import { geometries } from "./materials.js";

const clothes = [
  "#657d78",
  "#9f765c",
  "#9b9e91",
  "#4d6269",
  "#b8a98c",
  "#76717a",
  "#71815e",
];
const skin = ["#bd9e85", "#a98367", "#d0b397", "#98785f"];
const parent = new THREE.Object3D(),
  part = new THREE.Object3D(),
  joint = new THREE.Object3D(),
  matrix = new THREE.Matrix4();
function instance(mesh, index, pos, scale, color, rot = 0, pivot = null) {
  if (pivot) {
    joint.position.set(...pivot);
    joint.rotation.set(rot, 0, 0);
    joint.scale.set(1, 1, 1);
    joint.updateMatrix();
    part.position.set(...pos);
    part.rotation.set(0, 0, 0);
    part.scale.set(...scale);
    part.updateMatrix();
    matrix.copy(parent.matrix).multiply(joint.matrix).multiply(part.matrix);
  } else {
    part.position.set(...pos);
    part.rotation.set(rot, 0, 0);
    part.scale.set(...scale);
    part.updateMatrix();
    matrix.copy(parent.matrix).multiply(part.matrix);
  }
  mesh.setMatrixAt(index, matrix);
  mesh.setColorAt(index, color);
}
export function exteriorFigures(s) {
  if (!s.surroundings.people) return [];
  const list = [];
  for (let i = 0; i < s.surroundings.population; i++) {
    const t = s.exteriorTime * 0.38 + i * 1.35,
      tri = (t % 4) / 4;
    const x = tri < 0.5 ? -4.3 + tri * 17.2 : 4.3 - (tri - 0.5) * 17.2;
    list.push({
      id: 100 + i,
      x: i > 5 ? (i % 2 ? 3.6 : -3.6) : x,
      z: -4.7 - (i % 3) * 0.73,
      inside: false,
      external: true,
      visible: true,
      height: 0.94 + (i % 3) * 0.035,
      heading: tri < 0.5 ? Math.PI / 2 : -Math.PI / 2,
      walk: s.exteriorTime * 4 + i,
      moving: i <= 5,
    });
  }
  return list;
}
export default function People({ s }) {
  const bodies = useRef(),
    heads = useRef(),
    mapping = useRef([]);
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ roughness: 0.86 }),
    [],
  );
  const colors = useMemo(
    () => ({
      clothes: clothes.map((c) => new THREE.Color(c)),
      skin: skin.map((c) => new THREE.Color(c)),
      dark: new THREE.Color("#4e514b"),
      shoe: new THREE.Color("#454a45"),
      observer: new THREE.Color("#ba7747"),
    }),
    [],
  );
  useFrame(() => {
    const state = engine.state;
    const actors = [
      ...state.actors.filter((p) => p.visible),
      ...exteriorFigures(state),
    ];
    if (state.observer.visible && state.camera !== "observer")
      actors.push({
        id: 200,
        x: state.observer.x,
        z: state.observer.z,
        inside: false,
        observer: true,
        height: 1,
        heading: 0,
        walk: 0,
        moving: false,
      });
    mapping.current = actors;
    heads.current.count = actors.length;
    bodies.current.count = actors.length * 7;
    actors.forEach((p, i) => {
      const edge = state.room.width / 2;
      const onRamp =
        p.x >= edge &&
        p.x <= edge + 1.3 &&
        p.z >= (6.05 * state.room.length) / 8 &&
        p.z <= (7.5 * state.room.length) / 8;
      const floor = p.inside
        ? 0.145
        : onRamp
          ? 0.145 - ((p.x - edge) / 1.3) * 0.12
          : 0.025;
      const k = p.height;
      const swing = p.moving ? Math.sin(p.walk) * 0.32 : 0;
      const sway = Math.sin(state.elapsed * 0.7 + p.id) * 0.008;
      parent.position.set(p.x, floor, p.z);
      parent.rotation.set(0, p.heading, 0);
      parent.scale.set(k, k, k);
      parent.updateMatrix();
      const clothing = p.observer
        ? colors.observer
        : colors.clothes[p.id % clothes.length];
      instance(
        heads.current,
        i,
        [0, 1.57 + sway, 0],
        [0.135, 0.163, 0.138],
        colors.skin[p.id % 4],
      );
      instance(
        bodies.current,
        i * 7,
        [0, 1.13 + sway, 0],
        [0.32, 0.285, 0.2],
        clothing,
      );
      instance(
        bodies.current,
        i * 7 + 1,
        [0, -0.32, 0],
        [0.125, 0.35, 0.125],
        colors.dark,
        swing,
        [-0.105, 0.76, 0],
      );
      instance(
        bodies.current,
        i * 7 + 2,
        [0, -0.32, 0],
        [0.125, 0.35, 0.125],
        colors.dark,
        -swing,
        [0.105, 0.76, 0],
      );
      instance(
        bodies.current,
        i * 7 + 3,
        [0, -0.235, 0],
        [0.1, 0.235, 0.1],
        clothing,
        -swing,
        [-0.22, 1.36, 0],
      );
      instance(
        bodies.current,
        i * 7 + 4,
        [0, -0.235, 0],
        [0.1, 0.235, 0.1],
        clothing,
        swing,
        [0.22, 1.36, 0],
      );
      instance(
        bodies.current,
        i * 7 + 5,
        [0, -0.705, 0.055],
        [0.14, 0.055, 0.24],
        colors.shoe,
        swing,
        [-0.105, 0.76, 0],
      );
      instance(
        bodies.current,
        i * 7 + 6,
        [0, -0.705, 0.055],
        [0.14, 0.055, 0.24],
        colors.shoe,
        -swing,
        [0.105, 0.76, 0],
      );
    });
    heads.current.instanceMatrix.needsUpdate = true;
    bodies.current.instanceMatrix.needsUpdate = true;
    if (heads.current.instanceColor)
      heads.current.instanceColor.needsUpdate = true;
    if (bodies.current.instanceColor)
      bodies.current.instanceColor.needsUpdate = true;
  });
  const click = (event, body) => {
    event.stopPropagation();
    if (engine.state.compare) return;
    const p =
      mapping.current[
        body ? Math.floor(event.instanceId / 7) : event.instanceId
      ];
    if (!p) return;
    if (p.inside) engine.select(p.id);
    else if (p.external) engine.setObserver({ x: p.x, z: p.z, visible: true });
    else if (p.observer) engine.setCamera("observer");
  };
  return (
    <group>
      <instancedMesh
        ref={heads}
        args={[geometries.sphere, material, 30]}
        castShadow
        onClick={(e) => click(e, false)}
        frustumCulled={false}
      />
      <instancedMesh
        ref={bodies}
        args={[geometries.capsule, material, 210]}
        castShadow
        onClick={(e) => click(e, true)}
        frustumCulled={false}
      />
      {s.person && !s.compare && (
        <group position={[s.person.x, 0.155, s.person.z]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.29, 0.32, 40]} />
            <meshBasicMaterial
              color="#b2764b"
              transparent
              opacity={0.9}
              depthWrite={false}
            />
          </mesh>
          {s.camera !== "interior" && s.camera !== "observer" && (
            <Html
              position={[0, 2.05, 0]}
              center
              style={{ pointerEvents: "none" }}
            >
              <span className="person-label">
                Person {String(s.person.id).padStart(2, "0")}
              </span>
            </Html>
          )}
        </group>
      )}
      {s.observer.visible && s.camera !== "observer" && !s.compare && (
        <Html
          position={[s.observer.x, 2.02, s.observer.z]}
          center
          style={{ pointerEvents: "none" }}
        >
          <span className="observer-label">Outside observer</span>
        </Html>
      )}
    </group>
  );
}
