import React, {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { engine } from "../simulation/engine.js";
import { materials } from "./materials.js";
import Room from "./Room.jsx";
import Facade, { moduleGroups } from "./Facade.jsx";
import People from "./People.jsx";
import Surroundings from "./Surroundings.jsx";
import Cameras from "./Cameras.jsx";
import Analysis, { PerforationLabels } from "./Analysis.jsx";
import FloorPlan from "../components/FloorPlan.jsx";
import { poseModule } from "./perforation.js";

function Lighting({ s }) {
  const hemi = useRef(),
    sun = useRef(),
    insideA = useRef(),
    insideB = useRef();
  const colors = [
    new THREE.Color("#dfe9f5"),
    new THREE.Color("#c1a38d"),
    new THREE.Color("#17232e"),
  ];
  const sky = new THREE.Color(),
    warm = new THREE.Color();
  useFrame(({ scene }) => {
    const m = engine.state.lightMix,
      i = Math.min(1, Math.floor(m)),
      t = m - i;
    sky.copy(colors[i]).lerp(colors[i + 1], t);
    scene.background.copy(sky);
    scene.fog.color.copy(sky);
    hemi.current.intensity = THREE.MathUtils.lerp(1.55, 0.2, m / 2);
    sun.current.intensity = THREE.MathUtils.lerp(3.1, 0.16, m / 2);
    warm.set("#fff5dc").lerp(new THREE.Color("#f5b981"), Math.min(m, 1));
    sun.current.color.copy(warm);
    const override = engine.state.lightOverride;
    const intensity =
      override === "off"
        ? 0
        : override === "on"
          ? 29
          : THREE.MathUtils.lerp(1.2, 32, m / 2);
    insideA.current.intensity = intensity;
    insideB.current.intensity = intensity;
  }, -1);
  return (
    <>
      <color attach="background" args={["#dfe9f5"]} />
      <fog attach="fog" args={["#dfe9f5", 32, 80]} />
      <hemisphereLight ref={hemi} args={["#e7edf0", "#aaab95", 1.55]} />
      <directionalLight
        ref={sun}
        position={[-6, 13, -8]}
        intensity={3.1}
        color="#fff5dc"
        castShadow
        shadow-mapSize={s.quality === "high" ? [2048, 2048] : [1024, 1024]}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={16}
        shadow-camera-bottom={-12}
        shadow-camera-near={1}
        shadow-camera-far={45}
        shadow-normalBias={0.018}
        shadow-bias={-0.00008}
      />
      <pointLight
        ref={insideA}
        position={[
          -s.room.width * 0.22,
          s.room.height - 0.5,
          s.room.length * 0.475,
        ]}
        color="#ffdeb0"
        intensity={1}
        distance={10}
        decay={2}
      />
      <pointLight
        ref={insideB}
        position={[
          s.room.width * 0.24,
          s.room.height - 0.5,
          s.room.length * 0.525,
        ]}
        color="#ffe5c1"
        intensity={1}
        distance={10}
        decay={2}
      />
    </>
  );
}
function RenderController({ s }) {
  const { gl, scene, camera, size } = useThree();
  useEffect(() => {
    const section = s.camera === "section";
    gl.localClippingEnabled = true;
    const planes = section
      ? [new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0)]
      : [];
    scene.traverse((object) => {
      if (!object.isMesh || !object.material) return;
      for (const material of Array.isArray(object.material)
        ? object.material
        : [object.material]) {
        material.clippingPlanes = planes;
        material.clipShadows = true;
        material.needsUpdate = true;
      }
    });
    return () => {
      Object.values(materials).forEach((m) => {
        m.clippingPlanes = [];
      });
    };
  }, [
    s.camera,
    s.room.wallColor,
    s.room.wallMaterial,
    s.room.floorMaterial,
    s.room.panelWidth,
    s.room.panelHeight,
    s.room.modules,
    gl,
    scene,
  ]);
  useEffect(() => {
    engine.captureView = () => {
      const source = gl.domElement;
      const output = document.createElement("canvas"),
        ctx = output.getContext("2d");
      output.width = source.width;
      output.height = source.height + 124;
      ctx.fillStyle = "#f3f1ea";
      ctx.fillRect(0, 0, output.width, output.height);
      ctx.fillStyle = "#302f2b";
      ctx.font =
        "600 " + Math.max(16, Math.min(25, output.width / 36)) + "px Arial";
      ctx.fillText("ADAPTIVE KINETIC PRIVACY FACADE", 28, 37);
      ctx.font = "13px Arial";
      ctx.fillStyle = "#77776e";
      ctx.fillText("CONCEPTUAL ARCHITECTURAL SIMULATION", 28, 59);
      ctx.drawImage(source, 0, 78);
      ctx.fillStyle = "#55584f";
      ctx.font = "13px Arial";
      ctx.fillText(
        engine.getSnapshot().count +
          " / " +
          engine.getSnapshot().capacity +
          " occupants  ·  " +
          engine.state.environment +
          "  ·  " +
          engine.state.camera +
          " view",
        28,
        output.height - 18,
      );
      if (engine.state.compare) {
        ctx.fillStyle = "#f3f1ea";
        ctx.fillRect(0, 78, output.width, 35);
        ctx.fillStyle = "#302f2b";
        ctx.font = "14px Arial";
        ctx.fillText("OPEN / 100% command", 22, 101);
        ctx.fillText(
          engine.state.compareCondition.toUpperCase() + " / facade comparison",
          output.width / 2 + 22,
          101,
        );
      }
      output.toBlob((blob) => {
        if (!blob) {
          engine.change({
            notice: "Capture could not be created. Please try again.",
          });
          return;
        }
        const url = URL.createObjectURL(blob),
          a = document.createElement("a");
        a.href = url;
        a.download = "adaptive-facade-" + engine.state.camera + ".png";
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        engine.change({
          notice: "View captured. Check your browser downloads.",
        });
      }, "image/png");
    };
    return () => {
      engine.captureView = null;
    };
  }, [gl, scene, camera]);
  useFrame(() => {
    if (engine.state.compare) {
      gl.setScissorTest(true);
      const half = Math.floor(size.width / 2);
      if (camera.isPerspectiveCamera) {
        camera.aspect = half / size.height;
        camera.updateProjectionMatrix();
      }
      [100, 20].forEach((command, index) => {
        const condition = engine.state.compareCondition;
        const adaptive = engine.getSnapshot().metrics.comparison[1].commands;
        moduleGroups.forEach((group, i) =>
          poseModule(
            group,
            index === 0
              ? 100
              : condition === "closed"
                ? 0
                : condition === "adaptive"
                  ? adaptive[i]
                  : command,
          ),
        );
        scene.updateMatrixWorld(true);
        gl.setViewport(
          index * half,
          0,
          index ? size.width - half : half,
          size.height,
        );
        gl.setScissor(
          index * half,
          0,
          index ? size.width - half : half,
          size.height,
        );
        gl.render(scene, camera);
      });
      moduleGroups.forEach((group, i) =>
        poseModule(group, engine.state.actualCommands[i]),
      );
      gl.setScissorTest(false);
    } else {
      gl.setViewport(0, 0, size.width, size.height);
      if (camera.isPerspectiveCamera) {
        camera.aspect = size.width / size.height;
        camera.updateProjectionMatrix();
      }
      gl.render(scene, camera);
    }
  }, 1);
  return null;
}
function World({ s }) {
  return (
    <>
      <Lighting s={s} />
      <Cameras s={s} />
      <Room s={s} />
      <Facade s={s} />
      <Surroundings s={s} />
      <People s={s} />
      <Analysis s={s} />
      <PerforationLabels s={s} />
      <RenderController s={s} />
    </>
  );
}
class SceneBoundary extends React.Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    return this.state.error ? (
      <Fallback message={this.state.error.message} />
    ) : (
      this.props.children
    );
  }
}
function Fallback({ message }) {
  const s = useSyncExternalStore(engine.subscribe, engine.getSnapshot);
  return (
    <div className="webgl-fallback">
      <span className="eyebrow">LIVE 2D SIMULATION / WEBGL 2 UNAVAILABLE</span>
      <h2>A screen that adapts to people.</h2>
      <p>
        The simulation controls remain active. Enable browser hardware
        acceleration and reload to see the original 3D architectural model.
      </p>
      <div className="fallback-plan">
        <FloorPlan s={s} interactive />
      </div>
      <details>
        <summary>About the architectural model</summary>
        <p>
          {s.room.modules} pairs of perforated leaves fold outwards, connecting
          the room to the street. Flat screen → perforations → folding modules →
          local privacy.
        </p>
      </details>
      {message && (
        <details>
          <summary>Rendering information</summary>
          <p>{message}</p>
        </details>
      )}
      <button onClick={() => location.reload()}>Reload model</button>
    </div>
  );
}
export default function Scene() {
  const s = useSyncExternalStore(engine.subscribe, engine.getSnapshot);
  const [available] = useState(() => {
    try {
      return !!document.createElement("canvas").getContext("webgl2");
    } catch {
      return false;
    }
  });
  if (!available) return <Fallback />;
  return (
    <SceneBoundary>
      <Canvas
        shadows
        dpr={
          s.compare
            ? 1
            : s.quality === "high"
              ? 1.75
              : s.quality === "balanced"
                ? 1
                : Math.min(window.devicePixelRatio, 1.3)
        }
        gl={{
          antialias: true,
          alpha: false,
          preserveDrawingBuffer: true,
          powerPreference: "high-performance",
        }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
        }}
        fallback={<Fallback />}
      >
        <World s={s} />
      </Canvas>
    </SceneBoundary>
  );
}
