// All spatial values use metres. Defaults retain the supplied studio geometry.
export const DEFAULT_ROOM = Object.freeze({
  preset: "original",
  width: 10,
  length: 8,
  height: 3.6,
  windowWidth: 8,
  windowHeight: 2.96,
  sill: 0.33,
  offset: 0,
  modules: 4,
  panelWidth: 1.93,
  panelHeight: 2.88,
  wallColor: "#e8e4da",
  wallMaterial: "plaster",
  floorMaterial: "stone",
});
export const ROOM_PRESETS = {
  original: { label: "Original studio", room: DEFAULT_ROOM },
  bedroom: {
    label: "Bedroom",
    room: {
      width: 6,
      length: 5,
      height: 2.9,
      windowWidth: 3.6,
      windowHeight: 2.1,
      sill: 0.5,
      modules: 2,
      panelWidth: 1.73,
      panelHeight: 2.02,
      floorMaterial: "timber",
      wallColor: "#e7ded1",
    },
  },
  office: {
    label: "Office",
    room: {
      width: 8,
      length: 6,
      height: 3.2,
      windowWidth: 6,
      windowHeight: 2.5,
      sill: 0.4,
      modules: 3,
      panelWidth: 1.93,
      panelHeight: 2.42,
      floorMaterial: "concrete",
      wallColor: "#dce2df",
    },
  },
  classroom: {
    label: "Classroom",
    room: {
      width: 12,
      length: 10,
      height: 3.8,
      windowWidth: 9.6,
      windowHeight: 2.96,
      sill: 0.45,
      modules: 4,
      panelWidth: 2.33,
      panelHeight: 2.88,
      floorMaterial: "stone",
      wallColor: "#e9e5d8",
    },
  },
  studio: {
    label: "Architecture Studio",
    room: {
      width: 11,
      length: 9,
      height: 3.8,
      windowWidth: 8.8,
      windowHeight: 3.1,
      sill: 0.33,
      modules: 4,
      panelWidth: 2.13,
      panelHeight: 3.02,
      floorMaterial: "concrete",
      wallColor: "#e8e4da",
    },
  },
};
export const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const number = (value, fallback, min, max) =>
  Number.isFinite(Number(value)) ? clamp(Number(value), min, max) : fallback;
export function normalizeRoom(input = {}) {
  const r = { ...DEFAULT_ROOM, ...input };
  r.width = number(r.width, 10, 6, 14);
  r.length = number(r.length, 8, 5, 12);
  r.height = number(r.height, 3.6, 2.6, 4.8);
  r.modules = Math.round(number(r.modules, 4, 2, 4));
  r.windowWidth = number(
    r.windowWidth,
    8,
    r.modules * 0.9,
    Math.min(r.width - 1, r.modules * 2.5),
  );
  r.sill = number(r.sill, 0.33, 0.2, r.height - 1.5);
  r.windowHeight = number(r.windowHeight, 2.96, 1.1, r.height - r.sill - 0.25);
  r.offset = number(
    r.offset,
    0,
    -(r.width - r.windowWidth) / 2 + 0.3,
    (r.width - r.windowWidth) / 2 - 0.3,
  );
  r.panelWidth = number(
    r.panelWidth,
    1.93,
    0.7,
    r.windowWidth / r.modules - 0.07,
  );
  r.panelHeight = number(r.panelHeight, 2.88, 0.9, r.windowHeight - 0.08);
  if (!/^#[0-9a-f]{6}$/i.test(r.wallColor))
    r.wallColor = DEFAULT_ROOM.wallColor;
  if (!["plaster", "concrete", "timber"].includes(r.wallMaterial))
    r.wallMaterial = "plaster";
  if (!["stone", "concrete", "timber"].includes(r.floorMaterial))
    r.floorMaterial = "stone";
  if (!ROOM_PRESETS[r.preset]) r.preset = "custom";
  return r;
}
export function facadeLayout(room = DEFAULT_ROOM) {
  const pitch = room.windowWidth / room.modules;
  return Array.from({ length: room.modules }, (_, index) => ({
    index,
    left: room.offset - room.windowWidth / 2 + index * pitch,
    center: room.offset - room.windowWidth / 2 + (index + 0.5) * pitch,
    pitch,
    start: room.offset - room.windowWidth / 2 + index * pitch + 0.035,
    base: room.sill + 0.03,
  }));
}
export const roomPoint = (x, z, room = DEFAULT_ROOM) => [
  (x * room.width) / 10,
  (z * room.length) / 8,
];
export const furnitureScale = (room = DEFAULT_ROOM) =>
  Math.min(1, room.width / 10, room.length / 8);
export const ROOM_STORAGE_KEY = "adaptive-facade-room-v2";
export function encodeRoom(room) {
  return JSON.stringify({ version: 2, room: normalizeRoom(room) });
}
export function decodeRoom(text) {
  const data = JSON.parse(text);
  if (
    data?.version !== 2 ||
    !data.room ||
    typeof data.room !== "object" ||
    Array.isArray(data.room)
  )
    throw new Error("Unsupported room configuration");
  return normalizeRoom(data.room);
}

// A conservative crowd-simulation limit, not a code-compliant occupancy rating.
export const capacityForRoom = (room = DEFAULT_ROOM) =>
  Math.min(21, Math.floor((room.width * room.length) / 3));
