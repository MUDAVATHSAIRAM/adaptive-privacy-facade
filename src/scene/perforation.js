import * as THREE from "three";

export const LEAF_WIDTH = 0.965,
  LEAF_HEIGHT = 2.88,
  LEAF_DEPTH = 0.026;
export const HOLE_COLUMNS = 8,
  HOLE_ROWS = 24;
export function holeRadius(y) {
  return y > 1.96 ? 0.046 : y > 0.94 ? 0.019 : 0.033;
}
export function createLeafGeometry(
  perforated = true,
  width = LEAF_WIDTH,
  height = LEAF_HEIGHT,
) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(width, 0);
  shape.lineTo(width, height);
  shape.lineTo(0, height);
  shape.closePath();
  if (perforated)
    for (let row = 0; row < HOLE_ROWS; row++)
      for (let col = 0; col < HOLE_COLUMNS; col++) {
        const x = ((col + 0.5) * width) / HOLE_COLUMNS,
          y = ((row + 0.5) * height) / HOLE_ROWS;
        const hole = new THREE.Path();
        hole.absarc(
          x,
          y,
          Math.min(
            holeRadius((y / height) * LEAF_HEIGHT),
            (width / HOLE_COLUMNS) * 0.4,
            (height / HOLE_ROWS) * 0.4,
          ),
          0,
          Math.PI * 2,
          true,
        );
        shape.holes.push(hole);
      }
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: LEAF_DEPTH,
    bevelEnabled: false,
    curveSegments: 6,
    steps: 1,
  });
  geometry.translate(0, 0, -LEAF_DEPTH / 2);
  geometry.computeVertexNormals();
  return geometry;
}
export const leafGeometry = createLeafGeometry(true),
  flatLeafGeometry = createLeafGeometry(false);
export { commandAngle, hingeCoordinates } from "../simulation/kinematics.js";
import { hingeCoordinates } from "../simulation/kinematics.js";
// Real holes in extruded geometry mean renderer, shadows, and raycasts agree.
export function poseModule(group, command) {
  if (!group) return;
  const p = hingeCoordinates(command, group.userData.leafWidth ?? LEAF_WIDTH);
  group.children[0].rotation.y = p.angle;
  group.children[1].position.set(p.middle[0], 0, p.middle[1]);
  group.children[1].rotation.y = -p.angle;
  group.children[2].position.x = p.free[0];
}
