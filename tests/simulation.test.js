import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  Simulation,
  autoCommands,
  BASELINES,
} from "../src/simulation/engine.js";
import { blocked, zoneOf } from "../src/simulation/navigation.js";
import { traceVisibility } from "../src/simulation/visibility.js";
import {
  leafGeometry,
  LEAF_WIDTH,
  LEAF_HEIGHT,
  hingeCoordinates,
  poseModule,
  holeRadius,
} from "../src/scene/perforation.js";

function advance(engine, seconds, check) {
  for (let frame = 0; frame < seconds * 60; frame++) {
    engine.tick(1 / 60);
    check?.(engine);
  }
}
function capacity(e) {
  const s = e.getSnapshot();
  assert.ok(s.count >= 0 && s.count <= 21, "actual count must be 0–21");
  assert.ok(
    e.state.actors.length <= 21,
    "reservations and departing people also count against capacity",
  );
  assert.equal(
    new Set(e.state.actors.map((p) => p.id)).size,
    e.state.actors.length,
    "identities stay unique",
  );
}
test("entry and departure visit every actual count from 0 to 21 and back", () => {
  const e = new Simulation(),
    arrivals = new Set([0]),
    departures = new Set([21]);
  e.setTarget(21);
  advance(e, 70, (engine) => {
    capacity(engine);
    arrivals.add(engine.getSnapshot().count);
  });
  assert.equal(e.getSnapshot().count, 21);
  assert.equal(e.getSnapshot().entering, 0);
  assert.deepEqual(
    [...arrivals].sort((a, b) => a - b),
    Array.from({ length: 22 }, (_, i) => i),
  );
  for (const p of e.state.actors) {
    assert.ok(
      Math.hypot(p.x - p.destination.x, p.z - p.destination.z) < 0.1,
      "every person reaches their destination",
    );
    assert.ok(!blocked(p.x, p.z, 0.21), "a figure cannot be inside furniture");
    for (const q of e.state.actors)
      if (p.id < q.id) assert.ok(Math.hypot(p.x - q.x, p.z - q.z) > 0.45);
  }
  e.setTarget(0);
  advance(e, 260, (engine) => {
    capacity(engine);
    departures.add(engine.getSnapshot().count);
  });
  assert.equal(e.getSnapshot().count, 0);
  assert.equal(e.state.actors.length, 0);
  assert.equal(departures.size, 22);
});
test("rapid input reconciles reservations and newest occupancy targets", () => {
  const e = new Simulation();
  for (let i = 0; i < 70; i++) e.plus();
  assert.equal(e.state.actors.length, 21);
  assert.equal(
    e.getSnapshot().count,
    0,
    "accepted entries do not immediately become indoor occupants",
  );
  for (const n of [0, 21, 7, 14, 1, 21, 0, 21]) {
    e.setTarget(n);
    advance(e, 2.6, capacity);
  }
  advance(e, 160, capacity);
  assert.equal(e.getSnapshot().count, 21);
  for (let i = 0; i < 30; i++) e.minus();
  advance(e, 260, capacity);
  assert.equal(e.getSnapshot().count, 0);
});
test("selected occupants can change depth zones at full capacity", () => {
  const e = new Simulation();
  e.setTarget(21);
  advance(e, 75);
  e.select(e.state.actors[0].id);
  for (const zone of ["near", "center", "rear"]) {
    e.moveSelected(zone);
    advance(e, 40, capacity);
    const p = e.state.actors.find((p) => p.id === e.state.selected);
    assert.equal(zoneOf(p.z), zone);
    assert.ok(Math.hypot(p.x - p.destination.x, p.z - p.destination.z) < 0.1);
  }
});
test("Auto considers all people and observer direction; Manual retains independent commands", () => {
  const people = [
    { inside: true, x: -3.4, z: 1.3 },
    { inside: true, x: 3.4, z: 1.3 },
  ];
  assert.deepEqual(
    autoCommands([], "night", { x: 0, z: -5 }).commands,
    [100, 100, 100, 100],
  );
  assert.deepEqual(
    autoCommands(people, "day", { x: 0, z: -7 }).commands,
    [40, 100, 100, 40],
  );
  assert.deepEqual(
    autoCommands(people, "night", { x: 0, z: -7 }).commands,
    [10, 100, 100, 10],
  );
  const e = new Simulation();
  e.setMode("manual");
  e.setOpening(55);
  e.setOpening(10, 1);
  e.setTarget(7);
  e.change({ environment: "night" });
  advance(e, 30);
  assert.deepEqual(e.state.commands, [55, 10, 55, 55]);
  const prior = [...e.state.actualCommands];
  e.setMode("manual");
  assert.deepEqual(e.state.commands, prior);
});
test("comparison freezes one moment and restores camera and study settings", () => {
  const e = new Simulation();
  e.setTarget(7);
  advance(e, 20);
  e.change({ analysis: true, camera: "perspective" });
  const before = e.save();
  e.setCompare(true);
  advance(e, 10);
  assert.deepEqual(e.state.actors, before.actors);
  assert.equal(e.state.exteriorTime, before.exteriorTime);
  assert.equal(e.state.lightMix, before.lightMix);
  e.compareCamera("interior");
  e.setCompare(false);
  assert.equal(e.state.camera, "perspective");
  assert.equal(e.state.analysis, true);
});
test("the complete story reaches 21, pause freezes movement, and Exit restores user state", () => {
  const e = new Simulation();
  e.setTarget(7);
  advance(e, 25);
  e.setMode("manual");
  e.setOpening(43);
  const before = e.save();
  e.startDemo();
  assert.equal(e.state.actors.length, 0);
  advance(e, 12);
  e.pauseDemo();
  const paused = e.save();
  advance(e, 8);
  assert.deepEqual(e.state.actors, paused.actors);
  assert.equal(e.state.demo.time, paused.demo.time);
  e.pauseDemo();
  advance(e, 200, capacity);
  assert.equal(e.state.demo.index, 11);
  assert.equal(e.getSnapshot().count, 21);
  e.stepDemo(-8);
  assert.equal(e.state.demo.index, 3);
  assert.equal(e.getSnapshot().count, 1);
  e.applyStory(9, true);
  assert.equal(e.state.compare, true);
  assert.equal(e.getSnapshot().count, 21);
  e.exitDemo();
  const after = e.save();
  after.cameraRevision = before.cameraRevision;
  assert.deepEqual(after, before);
});
test("rigid bifold leaves remain connected, slide on the same track, and fold outwards", () => {
  const root = new THREE.Group();
  root.add(new THREE.Group(), new THREE.Group(), new THREE.Group());
  for (let command = 0; command <= 100; command++) {
    const h = hingeCoordinates(command);
    poseModule(root, command);
    root.updateMatrixWorld(true);
    const middle = new THREE.Vector3(LEAF_WIDTH, 0, 0).applyMatrix4(
      root.children[0].matrixWorld,
    );
    const joined = new THREE.Vector3(0, 0, 0).applyMatrix4(
      root.children[1].matrixWorld,
    );
    const free = new THREE.Vector3(LEAF_WIDTH, 0, 0).applyMatrix4(
      root.children[1].matrixWorld,
    );
    assert.ok(middle.distanceTo(joined) < 1e-10);
    assert.ok(Math.abs(free.z) < 1e-10);
    assert.ok(Math.abs(middle.length() - LEAF_WIDTH) < 1e-10);
    assert.ok(h.middle[1] <= 0);
    assert.ok(free.x >= 0 && free.x <= 2 * LEAF_WIDTH);
  }
  assert.ok(
    hingeCoordinates(100).free[0] < 0.15,
    "leaves remain stacked near their jamb",
  );
});
test("sight rays pass through real holes and stop at the first real obstruction", () => {
  const scene = new THREE.Scene();
  const leaf = new THREE.Mesh(
    leafGeometry,
    new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
  );
  leaf.userData.obstruction = "screen";
  scene.add(leaf);
  scene.updateMatrixWorld(true);
  const x = LEAF_WIDTH / 16,
    y = LEAF_HEIGHT / 48;
  assert.equal(traceVisibility(scene, [x, y, -1], [x, y, 1]).clear, true);
  const blockedRay = traceVisibility(
    scene,
    [0.004, 0.004, -1],
    [0.004, 0.004, 1],
  );
  assert.equal(blockedRay.clear, false);
  assert.equal(blockedRay.obstruction, "screen");
  assert.ok(blockedRay.end[2] < 0);
  const tree = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.1, 0.1),
    new THREE.MeshBasicMaterial(),
  );
  tree.position.set(x, y, 0.5);
  tree.userData.obstruction = "landscape";
  scene.add(tree);
  scene.updateMatrixWorld(true);
  assert.equal(
    traceVisibility(scene, [x, y, -1], [x, y, 1]).obstruction,
    "landscape",
  );
  tree.visible = false;
  assert.equal(traceVisibility(scene, [x, y, -1], [x, y, 1]).clear, true);
  assert.ok(
    holeRadius(2.5) > holeRadius(0.5) && holeRadius(0.5) > holeRadius(1.5),
  );
});
