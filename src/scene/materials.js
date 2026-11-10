import * as THREE from "three";

export const materials = {
  plaster: new THREE.MeshStandardMaterial({
    color: "#e8e4da",
    roughness: 0.91,
  }),
  concrete: new THREE.MeshStandardMaterial({
    color: "#c8c5ba",
    roughness: 0.95,
  }),
  floor: new THREE.MeshStandardMaterial({ color: "#ded9cc", roughness: 0.8 }),
  timber: new THREE.MeshStandardMaterial({ color: "#a68764", roughness: 0.82 }),
  bronze: new THREE.MeshStandardMaterial({
    color: "#a16d4d",
    roughness: 0.52,
    metalness: 0.48,
  }),
  bronzeEdge: new THREE.MeshStandardMaterial({
    color: "#73513c",
    roughness: 0.42,
    metalness: 0.65,
  }),
  charcoal: new THREE.MeshStandardMaterial({
    color: "#363c3b",
    roughness: 0.62,
    metalness: 0.25,
  }),
  fabric: new THREE.MeshStandardMaterial({ color: "#718076", roughness: 0.94 }),
  paper: new THREE.MeshStandardMaterial({ color: "#f6f2e8", roughness: 0.9 }),
  glass: new THREE.MeshStandardMaterial({
    color: "#d5e6e9",
    transparent: true,
    opacity: 0.075,
    roughness: 0.18,
    metalness: 0.2,
    depthWrite: false,
    side: THREE.DoubleSide,
  }),
  road: new THREE.MeshStandardMaterial({ color: "#777e7c", roughness: 1 }),
  paving: new THREE.MeshStandardMaterial({ color: "#bfbeb3", roughness: 1 }),
  grass: new THREE.MeshStandardMaterial({ color: "#89947a", roughness: 1 }),
  foliage: new THREE.MeshStandardMaterial({
    color: "#617858",
    roughness: 0.96,
  }),
  foliageLight: new THREE.MeshStandardMaterial({
    color: "#7c9069",
    roughness: 0.96,
  }),
  bark: new THREE.MeshStandardMaterial({ color: "#71664f", roughness: 1 }),
  tyre: new THREE.MeshStandardMaterial({ color: "#333635", roughness: 0.9 }),
  chrome: new THREE.MeshStandardMaterial({
    color: "#929997",
    roughness: 0.4,
    metalness: 0.7,
  }),
};
export const geometries = {
  box: new THREE.BoxGeometry(1, 1, 1),
  sphere: new THREE.SphereGeometry(1, 12, 8),
  foliage: new THREE.IcosahedronGeometry(1, 1),
  cylinder: new THREE.CylinderGeometry(1, 1, 1, 10),
  capsule: new THREE.CapsuleGeometry(0.5, 1, 3, 8),
};
