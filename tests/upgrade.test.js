import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  Simulation,
  autoCommands,
  affectedModules,
} from "../src/simulation/engine.js";
import {
  DEFAULT_ROOM,
  DEFAULT_ROOM as R,
  normalizeRoom,
  facadeLayout,
  ROOM_PRESETS,
  encodeRoom,
  decodeRoom,
  capacityForRoom,
} from "../src/simulation/roomConfig.js";
import {
  DEFAULT_CONTROL,
  hardwarePacket,
  exposureEstimate,
  freeArea,
} from "../src/simulation/control.js";
import { blocked } from "../src/simulation/navigation.js";
import { poseModule, createLeafGeometry } from "../src/scene/perforation.js";
const advance = (e, seconds) => {
  for (let i = 0; i < seconds * 60; i++) e.tick(1 / 60);
};
const observer = { x: 0, z: -7 };

test("room normalization constrains every window and panel inside its enclosure", () => {
  for (let i = 0; i < 160; i++) {
    const r = normalizeRoom({
      width: 4 + (i % 13),
      length: i % 16,
      height: 1 + (i % 7),
      modules: i % 7,
      windowWidth: i % 18,
      windowHeight: i % 7,
      sill: i % 5,
      offset: i - 70,
      panelWidth: i % 5,
      panelHeight: i % 8,
    });
    assert.ok(r.offset - r.windowWidth / 2 >= -r.width / 2 + 0.299);
    assert.ok(r.offset + r.windowWidth / 2 <= r.width / 2 - 0.299);
    assert.ok(r.sill + r.windowHeight <= r.height - 0.249);
    assert.ok(r.panelWidth <= r.windowWidth / r.modules - 0.069);
    assert.ok(r.panelHeight + 0.03 <= r.windowHeight);
    assert.equal(facadeLayout(r).length, r.modules);
  }
  assert.equal(
    normalizeRoom({ width: NaN, wallColor: "not-a-color" }).width,
    10,
  );
});

test("all room presets admit their full simulation capacity without blocked or overlapping destinations", () => {
  for (const key of Object.keys(ROOM_PRESETS)) {
    const e = new Simulation();
    e.roomPreset(key);
    e.setTarget(21);
    advance(e, 100);
    assert.equal(e.getSnapshot().count, capacityForRoom(e.state.room), key);
    for (const p of e.state.actors) {
      assert.ok(
        Math.hypot(p.x - p.destination.x, p.z - p.destination.z) < 0.16,
        `${key}: person ${p.id} arrives`,
      );
      assert.equal(
        blocked(p.x, p.z, 0.21, e.state.room),
        false,
        `${key}: clear furniture`,
      );
      for (const q of e.state.actors)
        if (p.id !== q.id) assert.ok(Math.hypot(p.x - q.x, p.z - q.z) > 0.45);
    }
  }
});

test("resizing an occupied studio refits people and commands without overlap", () => {
  const e = new Simulation();
  e.setTarget(21);
  advance(e, 75);
  for (const key of ["bedroom", "classroom", "office", "original"]) {
    e.roomPreset(key);
    advance(e, 30);
    assert.equal(e.state.commands.length, e.state.room.modules);
    assert.ok(e.state.actors.length <= e.getSnapshot().capacity);
    for (const p of e.state.actors) {
      assert.equal(blocked(p.x, p.z, 0.21, e.state.room), false);
      assert.ok(
        Math.hypot(p.x - p.destination.x, p.z - p.destination.z) < 0.16,
      );
      for (const q of e.state.actors)
        if (q.id !== p.id) assert.ok(Math.hypot(p.x - q.x, p.z - q.z) > 0.45);
    }
  }
});

test("privacy zoning follows shifted openings and ignores rays below high windows", () => {
  const p = { id: 1, inside: true, x: -3.4, z: 1.3 };
  assert.deepEqual(affectedModules(p, observer), [0]);
  assert.deepEqual(
    affectedModules(
      p,
      observer,
      normalizeRoom({ ...R, windowWidth: 4, offset: 2 }),
    ),
    [],
  );
  assert.deepEqual(
    affectedModules(
      p,
      observer,
      normalizeRoom({ ...R, sill: 2, windowHeight: 1.1 }),
    ),
    [],
  );
  for (const modules of [2, 3, 4]) {
    const r = normalizeRoom({ ...R, modules });
    for (let x = -4; x <= 4; x += 0.2)
      assert.ok(
        affectedModules({ ...p, x }, observer, r).every(
          (i) => i >= 0 && i < modules,
        ),
      );
  }
});

test("an unstable image-zone input does not cause alternating commands", () => {
  const e = new Simulation();
  e.setControl({ stabilityDelay: 0.7 });
  e.setCameraInput({ active: true, driving: true, detections: [{ u: 0.1 }] });
  advance(e, 0.3);
  assert.deepEqual(e.state.commands, [100, 100, 100, 100]);
  e.setCameraInput({ detections: [{ u: 0.9 }] });
  advance(e, 0.3);
  assert.deepEqual(e.state.commands, [100, 100, 100, 100]);
  advance(e, 0.6);
  assert.equal(e.state.commands[3], 60);
  assert.equal(e.state.commands[0], 100);
});

test("night rules strengthen occupied screening and account for interior lights", () => {
  const people = [{ id: 1, inside: true, x: 3.4, z: 1.3 }];
  const day = autoCommands(people, "day", observer);
  const night = autoCommands(people, "night", observer);
  const dark = autoCommands(
    people,
    "night",
    observer,
    R,
    DEFAULT_CONTROL,
    "off",
  );
  assert.ok(
    night.commands[3] < dark.commands[3] && dark.commands[3] < day.commands[3],
  );
  assert.equal(night.commands[0], 100);
  const privateMode = autoCommands(people, "day", observer, R, {
    ...DEFAULT_CONTROL,
    privacy: 90,
  });
  assert.ok(privateMode.commands[3] < day.commands[3]);
});

test("configurable empty-room and safety targets restore manual commands exactly", () => {
  const e = new Simulation();
  e.setControl({ emptyOpening: 75, safetyOpening: 35 });
  advance(e, 1);
  assert.deepEqual(e.state.commands, [75, 75, 75, 75]);
  e.setMode("manual");
  e.setOpening(45);
  e.setOpening(12, 2);
  e.setSafety(true);
  e.setOpening(90);
  advance(e, 2);
  assert.deepEqual(e.state.commands, [35, 35, 35, 35]);
  e.setSafety(false);
  assert.deepEqual(e.state.commands, [45, 45, 12, 45]);
  assert.equal(e.state.mode, "manual");
});

test("safety override exits paused comparison and demonstration before taking control", () => {
  const e = new Simulation();
  e.startDemo();
  e.pauseDemo();
  e.setSafety(true);
  advance(e, 2);
  assert.equal(e.state.demo, null);
  assert.equal(e.state.safety.active, true);
  e.setSafety(false);
  e.setCompare(true);
  e.setSafety(true);
  assert.equal(e.state.compare, false);
  assert.equal(e.state.safety.active, true);
});

test("manual control cancels camera driving while stopping camera restores simulated input", () => {
  const e = new Simulation();
  e.setTarget(1);
  advance(e, 25);
  const original = e.state.actors.map((p) => p.id);
  e.setCameraInput({
    active: true,
    driving: true,
    detections: [{ u: 0.05 }, { u: 0.95 }],
  });
  advance(e, 2);
  assert.equal(e.getSnapshot().metrics.controlCount, 2);
  e.setMode("manual");
  e.setOpening(42);
  e.setCameraInput({ detections: [{ u: 0.3 }] });
  advance(e, 2);
  assert.equal(e.state.mode, "manual");
  assert.deepEqual(e.state.commands, [42, 42, 42, 42]);
  e.setCameraInput({ active: false, detections: [] });
  assert.deepEqual(
    e.state.actors.map((p) => p.id),
    original,
  );
  assert.equal(e.getSnapshot().metrics.controlCount, 1);
});

test("hardware mapping keeps opening percentage independent from reversed servo calibration", () => {
  const p = hardwarePacket(
    [0, 50, 100],
    [
      { closed: 10, open: 170 },
      { closed: 160, open: 20 },
      { closed: 30, open: 90 },
    ],
  );
  assert.equal(p.serialPreview, "M1:10,M2:90,M3:90");
  assert.deepEqual(
    p.modules.map((m) => m.openingPercent),
    [0, 50, 100],
  );
  assert.equal(p.calibrated, false);
  assert.equal(p.source, "simulation");
});

test("room persistence round-trips and rejects corrupt or unsupported saves", () => {
  const r = normalizeRoom({ ...R, width: 7.3, modules: 3, offset: 0.3 });
  assert.deepEqual(decodeRoom(encodeRoom(r)), r);
  assert.throws(() => decodeRoom("{broken"));
  assert.throws(() => decodeRoom('{"version":1}'));
});

test("manual position changes reject walls and furniture but reach a clear point", () => {
  const e = new Simulation();
  e.setTarget(1);
  advance(e, 30);
  const p = e.state.actors[0],
    before = { ...p.destination };
  e.moveSelectedTo(-4.25, 3.6);
  assert.deepEqual(p.destination, before);
  e.moveSelectedTo(100, 100);
  assert.deepEqual(p.destination, before);
  e.moveSelectedTo(2, 2);
  advance(e, 25);
  assert.ok(Math.hypot(p.x - 2, p.z - 2) < 0.1);
});

test("resized leaves remain rigid and both hinges stay connected", () => {
  for (const width of [0.35, 0.72, 1.2]) {
    const root = new THREE.Group();
    root.userData.leafWidth = width;
    root.add(new THREE.Group(), new THREE.Group(), new THREE.Group());
    for (const opening of [0, 20, 50, 80, 100]) {
      poseModule(root, opening);
      root.updateMatrixWorld(true);
      const a = new THREE.Vector3(width, 0, 0).applyMatrix4(
        root.children[0].matrixWorld,
      );
      const b = new THREE.Vector3().applyMatrix4(root.children[1].matrixWorld);
      const free = new THREE.Vector3(width, 0, 0).applyMatrix4(
        root.children[1].matrixWorld,
      );
      assert.ok(a.distanceTo(b) < 1e-10);
      assert.ok(Math.abs(a.length() - width) < 1e-10);
      assert.ok(Math.abs(free.z) < 1e-10);
    }
    const geometry = createLeafGeometry(true, width, 1.1);
    geometry.computeBoundingBox();
    assert.ok(Math.abs(geometry.boundingBox.max.x - width) < 1e-6);
    geometry.dispose();
  }
});

test("estimated exposure and opening stay bounded and compare consistently", () => {
  const people = [{ id: 1, inside: true, x: 3.4, z: 1.3 }];
  const open = exposureEstimate(people, observer, [100, 100, 100, 100]);
  const closed = exposureEstimate(people, observer, [0, 0, 0, 0]);
  assert.ok(open > closed && closed > 0 && open <= 100);
  assert.equal(exposureEstimate([], observer, [0, 0, 0, 0]), null);
  let previous = -1;
  for (let c = 0; c <= 100; c++) {
    const value = freeArea(c);
    assert.ok(value >= previous && value <= 100);
    previous = value;
  }
});

test("scenario presets selected during a demo apply to the restored live state", () => {
  const e = new Simulation();
  e.startDemo();
  e.preset("night");
  assert.equal(e.state.demo, null);
  assert.equal(e.state.environment, "night");
  assert.equal(e.state.mode, "auto");
});

test("paused story seeks land on matching light and facade keyframes", () => {
  const e = new Simulation();
  e.startDemo();
  e.pauseDemo();
  e.applyStory(8, true);
  assert.deepEqual(e.state.actualCommands, [75, 75, 75, 75]);
  e.applyStory(9, true);
  assert.equal(e.state.lightMix, 2);
  assert.equal(e.state.compare, true);
});

test("camera input stops for a frozen comparison and safety cannot be frozen", () => {
  const e = new Simulation();
  e.setCameraInput({ active: true, driving: true, detections: [{ u: 0.2 }] });
  e.setCompare(true);
  assert.equal(e.state.cameraInput.active, false);
  e.setSafety(true);
  e.setCompare(true);
  assert.equal(e.state.compare, false);
});
