import { DEFAULT_ROOM, roomPoint, furnitureScale } from "./roomConfig.js";
import { depthZone } from "./control.js";
// Model units are metres. The door is in the right wall, centred at z = 6.75.
export const DOOR = [5, 6.75];
export const FURNITURE = [
  { x: -4.25, z: 3.6, w: 0.95, d: 1.7 },
  { x: -4.25, z: 5.65, w: 0.95, d: 1.7 },
  { x: -3.35, z: 3.6, w: 0.6, d: 0.65 },
  { x: -3.35, z: 5.65, w: 0.6, d: 0.65 },
  { x: -0.4, z: 7.4, w: 3.2, d: 0.65 },
  { x: -4.35, z: 0.7, w: 0.55, d: 0.55 },
  { x: 4.35, z: 0.75, w: 0.55, d: 0.55 },
];
export const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
export const zoneOf = depthZone;
export const zoneLabel = (z) =>
  ({ near: "Near window", center: "Center", rear: "Rear" })[z];
export function furniture(room = DEFAULT_ROOM) {
  const k = furnitureScale(room);
  return FURNITURE.map((o) => {
    let [x, z] = roomPoint(o.x, o.z, room);
    if (o.x === -3.35) x = (-4.25 * room.width) / 10 + 0.9 * k;
    return { x, z, w: o.w * k, d: o.d * k };
  });
}
export const blocked = (x, z, margin = 0.24, room = DEFAULT_ROOM) =>
  furniture(room).some(
    (o) =>
      Math.abs(x - o.x) < o.w / 2 + margin &&
      Math.abs(z - o.z) < o.d / 2 + margin,
  );

// More destinations than people, so a full studio still permits repositioning.
export const DESTINATIONS = [];
for (const z of [1.35, 2.35, 3.35, 4.55, 5.65, 6.65]) {
  for (const x of [-3.9, -2.8, -1.65, -0.5, 0.65, 1.8, 2.95]) {
    if (!blocked(x, z, 0.4)) DESTINATIONS.push({ x, z, zone: zoneOf(z) });
  }
}
export function destinations(room = DEFAULT_ROOM) {
  const list = [];
  for (const z0 of [1.35, 2.35, 3.35, 4.55, 5.65, 6.65])
    for (const x0 of [-3.9, -2.8, -1.65, -0.5, 0.65, 1.8, 2.95]) {
      const [x, z] = roomPoint(x0, z0, room);
      if (!blocked(x, z, 0.28, room))
        list.push({ x, z, zone: zoneOf(z, room) });
    }
  return list;
}
export function findDestination(
  actors,
  zone,
  id,
  seed = 0,
  room = DEFAULT_ROOM,
) {
  const taken = actors
    .filter((p) => p.id !== id && p.wanted)
    .map((p) => p.destination);
  let free = (
    room === DEFAULT_ROOM || (room.width === 10 && room.length === 8)
      ? DESTINATIONS
      : destinations(room)
  ).filter(
    (d) =>
      (!zone || d.zone === zone) &&
      !taken.some((t) => t && distance([d.x, d.z], [t.x, t.z]) < 0.58),
  );
  if (!free.length) return null;
  // A coprime stride distributes people across the room without perfect rows.
  return { ...free[(seed * 5 + 2) % free.length] };
}

// A* keeps world-metre clearance when the enclosure is resized.
export function insidePath(
  start,
  end,
  actors = [],
  ignoreId = -1,
  room = DEFAULT_ROOM,
) {
  const STEP = 0.1,
    X0 = -room.width / 2 + 0.5,
    Z0 = (0.65 * room.length) / 8,
    NX = Math.round((room.width - 1) / STEP) + 1,
    NZ = Math.round(((room.length * 7.15) / 8 - Z0) / STEP) + 1;
  const point = (index) => [
    X0 + (index % NX) * STEP,
    Z0 + Math.floor(index / NX) * STEP,
  ];
  const nearest = (p) =>
    Math.min(NZ - 1, Math.max(0, Math.round((p[1] - Z0) / STEP))) * NX +
    Math.min(NX - 1, Math.max(0, Math.round((p[0] - X0) / STEP)));
  const first = nearest(start),
    last = nearest(end);
  const people = actors.filter(
    (p) =>
      p.id !== ignoreId &&
      p.inside &&
      p.visible &&
      (!p.path.length || !p.wanted || p.wait > 0.4),
  );
  const valid = (index) => {
    const [x, z] = point(index);
    return (
      !blocked(x, z, 0.24, room) &&
      !people.some(
        (p) =>
          distance([x, z], [p.x, p.z]) < 0.48 &&
          distance([p.x, p.z], end) > 0.35,
      )
    );
  };
  const open = new Set([first]),
    previous = new Map();
  const cost = new Map([[first, 0]]),
    score = new Map([[first, distance(start, end)]]);
  let found = false;
  while (open.size) {
    let at = -1,
      best = Infinity;
    for (const n of open)
      if (score.get(n) < best) {
        best = score.get(n);
        at = n;
      }
    if (at === last) {
      found = true;
      break;
    }
    open.delete(at);
    const ix = at % NX,
      iz = Math.floor(at / NX);
    for (const [dx, dz] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1],
    ]) {
      const xx = ix + dx,
        zz = iz + dz,
        next = zz * NX + xx;
      if (xx < 0 || xx >= NX || zz < 0 || zz >= NZ || !valid(next)) continue;
      if (dx && dz && (!valid(iz * NX + xx) || !valid(zz * NX + ix))) continue;
      const g = cost.get(at) + (dx && dz ? Math.SQRT2 : 1);
      if (g >= (cost.get(next) ?? Infinity)) continue;
      previous.set(next, at);
      cost.set(next, g);
      score.set(next, g + distance(point(next), end) / STEP);
      open.add(next);
    }
  }
  if (!found) return []; // Wait and retry; never walk through a blocked object.
  const route = [];
  for (let n = last; n !== first; n = previous.get(n)) route.push(point(n));
  route.reverse();
  // Collapse only collinear grid runs; do not cut obstacle corners.
  const simple = [];
  for (let i = 0; i < route.length; i++) {
    const a = i ? route[i - 1] : start,
      b = route[i],
      c = route[i + 1];
    if (
      !c ||
      Math.abs((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0])) >
        0.001
    )
      simple.push(b);
  }
  simple.push([...end]);
  return simple;
}
