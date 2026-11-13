import * as THREE from "three";
const ray = new THREE.Raycaster();
export function traceVisibility(scene, origin, end) {
  const vector = new THREE.Vector3(...end).sub(new THREE.Vector3(...origin));
  ray.set(new THREE.Vector3(...origin), vector.clone().normalize());
  ray.near = 0.02;
  ray.far = vector.length() - 0.02;
  const objects = [];
  scene.traverseVisible((o) => {
    if (o.isMesh && o.userData.obstruction) objects.push(o);
  });
  const hit = ray.intersectObjects(objects, false)[0];
  return {
    start: origin,
    end: hit ? hit.point.toArray() : end,
    clear: !hit,
    obstruction: hit?.object.userData.obstruction || null,
  };
}
