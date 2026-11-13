import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  PerspectiveCamera,
  OrthographicCamera,
} from "@react-three/drei";
import * as THREE from "three";
import { engine } from "../simulation/engine.js";

export default function Cameras({ s }) {
  const controls = useRef(),
    destination = useRef(null),
    last = useRef(-1),
    oldMode = useRef(null);
  const { size } = useThree();
  const ortho = ["plan", "section", "elevation"].includes(s.camera);
  const eye = ["interior", "exterior", "observer"].includes(s.camera);
  useFrame(({ camera }, dt) => {
    const state = engine.state;
    if (!controls.current) return;
    if (last.current !== state.cameraRevision) {
      const r = state.room,
        sx = r.width / 10,
        sz = r.length / 8;
      const views = {
        perspective: [
          [11.8 * sx, 9.2 * Math.max(sx, sz), -11.5 * sx],
          [0, 0.9, 1.5 * sz],
          38,
        ],
        interior: [[3.85 * sx, 1.745, 5.8 * sz], [0, 1.6, -1.5], 62],
        exterior: [[-2.6 * sx, 1.65, -7.6 * sx], [0, 1.65, 2.5], 58],
        observer: [
          [state.observer.x, 1.65, state.observer.z],
          [state.observer.x * 0.25, 1.65, 3.4],
          65,
        ],
        detail: [
          [
            r.offset - r.windowWidth / 4,
            r.sill + r.panelHeight / 2 + 0.35,
            -4.8,
          ],
          [r.offset - r.windowWidth / 4, r.sill + r.panelHeight / 2, -0.35],
          44,
        ],
        plan: [[0, 30, r.length / 2 - 0.8], [0, 0, r.length / 2 - 0.8], 40],
        section: [[28, 2.4, -1], [0, 2.4, -1], 40],
        elevation: [
          [r.offset, r.height / 2, -20],
          [r.offset, r.height / 2, 0],
          40,
        ],
      };
      const view = views[state.camera];
      destination.current = {
        position: new THREE.Vector3(...view[0]),
        target: new THREE.Vector3(...view[1]),
      };
      camera.up.set(
        0,
        state.camera === "plan" ? 0 : 1,
        state.camera === "plan" ? -1 : 0,
      );
      camera.near = 0.06;
      camera.far = 120;
      if (camera.isPerspectiveCamera)
        camera.fov = state.compare
          ? state.camera === "interior"
            ? 91
            : 82
          : view[2];
      if (camera.isOrthographicCamera)
        camera.zoom =
          state.camera === "plan"
            ? Math.min(size.width / (r.width + 5), size.height / (r.length + 6))
            : state.camera === "elevation"
              ? Math.min(
                  size.width / (r.width + 4),
                  size.height / (r.height + 4),
                )
              : Math.min(size.width / 25, size.height / 11);
      // Eye-level transitions use a short crossfade in the UI, avoiding flights through the enclosure.
      const snap =
        last.current === -1 ||
        state.reducedMotion ||
        ["interior", "observer", "plan", "section"].includes(state.camera) ||
        ["interior", "observer", "plan", "section"].includes(oldMode.current);
      if (snap) {
        camera.position.copy(destination.current.position);
        controls.current.target.copy(destination.current.target);
        destination.current = null;
      }
      camera.updateProjectionMatrix();
      controls.current.update();
      last.current = state.cameraRevision;
      oldMode.current = state.camera;
    }
    if (destination.current) {
      const alpha = 1 - Math.exp(-dt * 5);
      camera.position.lerp(destination.current.position, alpha);
      controls.current.target.lerp(destination.current.target, alpha);
      if (camera.position.distanceTo(destination.current.position) < 0.015)
        destination.current = null;
      controls.current.update();
    }
  }, -2);
  useEffect(() => {
    last.current = -1;
  }, [size.width, size.height]);
  return (
    <>
      <PerspectiveCamera
        makeDefault={!ortho}
        position={[11.8, 9.2, -11.5]}
        fov={38}
        near={0.06}
        far={120}
      />
      <OrthographicCamera
        makeDefault={ortho}
        position={[0, 30, 0]}
        near={0.06}
        far={120}
        zoom={25}
      />
      <OrbitControls
        ref={controls}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        onStart={() => {
          destination.current = null;
        }}
        enablePan={!eye}
        enableRotate={!ortho && !eye}
        enableZoom={!eye}
        minDistance={3}
        maxDistance={38}
        minZoom={12}
        maxZoom={85}
        minPolarAngle={0.15}
        maxPolarAngle={Math.PI / 2 - 0.08}
        target={[0, 0.9, 1.5]}
      />
    </>
  );
}
