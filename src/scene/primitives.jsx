import { materials, geometries } from "./materials.js";

export function Box({
  position,
  size = [1, 1, 1],
  material = "plaster",
  obstruction = "room",
  ...props
}) {
  return (
    <mesh
      geometry={geometries.box}
      material={typeof material === "string" ? materials[material] : material}
      position={position}
      scale={size}
      castShadow
      receiveShadow
      userData={{ obstruction }}
      {...props}
    />
  );
}
export function Cylinder({
  position,
  size = [1, 1, 1],
  material = "charcoal",
  obstruction = "room",
  ...props
}) {
  return (
    <mesh
      geometry={geometries.cylinder}
      material={typeof material === "string" ? materials[material] : material}
      position={position}
      scale={size}
      castShadow
      receiveShadow
      userData={{ obstruction }}
      {...props}
    />
  );
}
export function Plant({ position, scale = 1 }) {
  return (
    <group position={position} scale={scale}>
      <Cylinder
        position={[0, 0.22, 0]}
        size={[0.22, 0.44, 0.22]}
        material="concrete"
      />
      {[
        [-0.16, 0.75, 0.04],
        [0.18, 0.96, -0.07],
        [0, 1.15, 0.08],
        [0.03, 0.67, -0.17],
      ].map((p, i) => (
        <mesh
          key={i}
          geometry={geometries.foliage}
          material={materials.foliage}
          position={p}
          scale={[0.25, 0.4, 0.18]}
          rotation={[i * 0.4, i * 0.9, 0.4 - i * 0.22]}
          castShadow
          userData={{ obstruction: "landscape" }}
        />
      ))}
    </group>
  );
}
