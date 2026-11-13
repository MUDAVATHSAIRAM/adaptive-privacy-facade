import { useEffect, useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, Line } from "@react-three/drei";
import { engine } from "../simulation/engine.js";
import { materials } from "./materials.js";
import {
  leafGeometry,
  createLeafGeometry,
  flatLeafGeometry,
  LEAF_WIDTH,
  LEAF_HEIGHT,
  poseModule,
} from "./perforation.js";
import { facadeLayout } from "../simulation/roomConfig.js";
import { Box, Cylinder } from "./primitives.jsx";

export const moduleGroups = [];
const bronzeMaterials = [materials.bronze, materials.bronzeEdge];
function Leaf({ flat = false, width, height }) {
  const custom = width !== LEAF_WIDTH || height !== LEAF_HEIGHT;
  const geometry = useMemo(
    () =>
      custom
        ? createLeafGeometry(!flat, width, height)
        : flat
          ? flatLeafGeometry
          : leafGeometry,
    [flat, width, height, custom],
  );
  useEffect(
    () => () => {
      if (custom) geometry.dispose();
    },
    [geometry, custom],
  );
  return (
    <group>
      <mesh
        geometry={geometry}
        material={bronzeMaterials}
        castShadow
        receiveShadow
        userData={{ obstruction: "screen" }}
      />
      <Box
        position={[width / 2, 0.028, 0]}
        size={[width, 0.044, 0.05]}
        material="bronzeEdge"
        obstruction="screen"
      />
      <Box
        position={[width / 2, height - 0.028, 0]}
        size={[width, 0.044, 0.05]}
        material="bronzeEdge"
        obstruction="screen"
      />
      {[0.22, height / 2, height - 0.22].map((y) => (
        <Cylinder
          key={y}
          position={[0, y, 0]}
          size={[0.028, 0.12, 0.028]}
          material="bronzeEdge"
          obstruction="screen"
        />
      ))}
    </group>
  );
}
function Module({ index, s, layout }) {
  const width = s.room.panelWidth / 2,
    height = s.room.panelHeight;
  const group = useRef();
  useEffect(() => {
    moduleGroups[index] = group.current;
    return () => {
      moduleGroups[index] = null;
    };
  }, [index]);
  useFrame(
    () => poseModule(group.current, engine.state.actualCommands[index]),
    -1,
  );
  return (
    <group position={[layout.start, layout.base, -0.34]}>
      <group
        ref={group}
        userData={{ leafWidth: width }}
        onClick={(e) => {
          e.stopPropagation();
          if (!engine.state.compare) engine.change({ selectedModule: index });
        }}
      >
        <group>
          <Leaf flat={s.form === 0} width={width} height={height} />
        </group>
        <group>
          <Leaf flat={s.form === 0} width={width} height={height} />
        </group>
        <group>
          <Cylinder
            position={[0, height / 2, 0]}
            size={[0.024, height, 0.024]}
            material="bronzeEdge"
            obstruction="screen"
          />
        </group>
      </group>
      {s.selectedModule === index && (
        <Line
          points={[
            [0, -0.08, -0.02],
            [s.room.panelWidth, -0.08, -0.02],
          ]}
          color="#bc7846"
          lineWidth={3}
        />
      )}
      {["perspective", "detail", "exterior", "elevation"].includes(s.camera) &&
        !s.compare && (
          <Html
            position={[width, height + 0.2, -0.03]}
            center
            distanceFactor={13}
            style={{ pointerEvents: "auto" }}
          >
            <button
              aria-label={`Select module M0${index + 1}`}
              onClick={() => engine.change({ selectedModule: index })}
              className={
                "module-label " + (s.selectedModule === index ? "selected" : "")
              }
            >
              {"M0" + (index + 1)}
            </button>
          </Html>
        )}
    </group>
  );
}
export default function Facade({ s }) {
  const room = s.room,
    layouts = facadeLayout(room),
    top = room.sill + room.windowHeight;
  return (
    <group>
      <Box
        position={[room.offset, top + 0.01, -0.34]}
        size={[room.windowWidth + 0.1, 0.1, 0.11]}
        material="charcoal"
        obstruction="frame"
      />
      <Box
        position={[room.offset, room.sill - 0.03, -0.34]}
        size={[room.windowWidth + 0.1, 0.08, 0.11]}
        material="charcoal"
        obstruction="frame"
      />
      {[...layouts.map((l) => l.left), room.offset + room.windowWidth / 2].map(
        (x) => (
          <Box
            key={x}
            position={[x, room.sill + room.windowHeight / 2, -0.34]}
            size={[0.045, room.windowHeight + 0.04, 0.06]}
            material="charcoal"
            obstruction="frame"
          />
        ),
      )}
      {layouts.map((layout) => (
        <Module key={layout.index} index={layout.index} layout={layout} s={s} />
      ))}
    </group>
  );
}
