import { DEFAULT_ROOM, facadeLayout, clamp } from "./roomConfig.js";
export const BASELINES = {
  day: { rear: 80, center: 60, near: 40 },
  evening: { rear: 60, center: 45, near: 30 },
  night: { rear: 40, center: 25, near: 10 },
};
export const DEFAULT_CONTROL = Object.freeze({
  emptyOpening: 100,
  safetyOpening: 100,
  stabilityDelay: 0.7,
  privacy: 50,
});
export function depthZone(z, room = DEFAULT_ROOM) {
  return z < (room.length * 2.7) / 8
    ? "near"
    : z < (room.length * 5.15) / 8
      ? "center"
      : "rear";
}
export function affectedModules(person, observer, room = DEFAULT_ROOM) {
  if (!person.inside) return [];
  if (person.imageX !== undefined)
    return [
      Math.min(
        room.modules - 1,
        Math.floor(clamp(person.imageX, 0, 1) * room.modules),
      ),
    ];
  const result = new Set();
  const denominator = person.z - observer.z;
  if (Math.abs(denominator) < 1e-6) return [];
  for (const dx of [-0.22, 0, 0.22]) {
    const t = (-0.32 - observer.z) / denominator;
    const x = observer.x + t * (person.x + dx - observer.x);
    const eye = 1.65 + t * (0.145 + 1.55 * (person.height || 1) - 1.65);
    if (eye < room.sill || eye > room.sill + room.windowHeight) continue;
    const left = room.offset - room.windowWidth / 2;
    if (t >= 0 && t <= 1 && x >= left && x <= left + room.windowWidth)
      result.add(
        Math.min(
          room.modules - 1,
          Math.floor((x - left) / (room.windowWidth / room.modules)),
        ),
      );
  }
  return [...result];
}
export function controlActors(s) {
  return s.cameraInput.driving
    ? s.cameraInput.detections.map((p, i) => ({
        id: i + 1,
        inside: true,
        x: s.room.offset + (p.u - 0.5) * s.room.windowWidth,
        z: s.room.length * 0.4,
        imageX: p.u,
      }))
    : s.actors;
}
export function autoCommands(
  actors,
  environment,
  observer,
  room = DEFAULT_ROOM,
  settings = DEFAULT_CONTROL,
  lightOverride = "auto",
) {
  const occupied = actors.some((p) => p.inside);
  const commands = Array(room.modules).fill(
    occupied ? 100 : settings.emptyOpening,
  );
  const reasons = Array(room.modules).fill(null);
  const affected = Array.from({ length: room.modules }, () => []);
  // A lit interior at night has the strongest assumed contrast. This is a rule, not photometry.
  const light =
    environment === "night" && lightOverride === "off"
      ? "evening"
      : environment;
  for (const p of actors) {
    if (!p.inside) continue;
    const zone = depthZone(p.z, room);
    const command = clamp(
      (BASELINES[light] || BASELINES.day)[zone] - (settings.privacy - 50) * 0.4,
      0,
      100,
    );
    for (const i of affectedModules(p, observer, room)) {
      affected[i].push(p.id);
      if (command < commands[i]) {
        commands[i] = command;
        reasons[i] = zone;
      }
    }
  }
  return { commands, reasons, affected };
}
// Deliberately separate opening commands and future, uncalibrated motor angles.
export function hardwarePacket(commands, calibration) {
  const modules = commands.map((opening, index) => {
    const c = calibration[index] || { closed: 0, open: 90 };
    const openingPercent = clamp(opening, 0, 100);
    return {
      id: `M${index + 1}`,
      openingPercent: Math.round(openingPercent),
      targetServoDegrees: Math.round(
        clamp(c.closed + ((c.open - c.closed) * openingPercent) / 100, 0, 180),
      ),
    };
  });
  return {
    version: 1,
    source: "simulation",
    calibrated: false,
    modules,
    serialPreview: modules
      .map((m) => `${m.id}:${m.targetServoDegrees}`)
      .join(","),
  };
}
// Projected clear area outside the leaves; ignores perforations, mullions and perspective.
export function freeArea(command, room = DEFAULT_ROOM) {
  const coverage =
    (room.panelWidth * room.panelHeight) /
    ((room.windowWidth / room.modules) * room.windowHeight);
  return clamp(
    100 *
      (1 -
        coverage *
          Math.cos(((clamp(command, 0, 100) / 100) * 86 * Math.PI) / 180)),
    0,
    100,
  );
}
export function exposureEstimate(
  actors,
  observer,
  commands,
  room = DEFAULT_ROOM,
  environment = "day",
  lights = "auto",
) {
  const pairs = actors
    .filter((p) => p.inside)
    .flatMap((p) => affectedModules(p, observer, room));
  if (!pairs.length) return null;
  const contrast =
    environment === "night" && lights !== "off"
      ? 1
      : environment === "evening" || lights === "on"
        ? 0.85
        : 0.7;
  return Math.round(
    pairs.reduce(
      (sum, i) => sum + (12 + 0.88 * freeArea(commands[i], room)) * contrast,
      0,
    ) / pairs.length,
  );
}
export function moduleExplanation(s, index, result) {
  if (s.safety.active)
    return `Safety demonstration: all modules target ${s.control.safetyOpening}%.`;
  if (s.mode === "manual")
    return `Manual override: M0${index + 1} is set by you.`;
  const people = controlActors(s).filter((p) => p.inside);
  if (!people.length)
    return `Empty input: default opening ${s.control.emptyOpening}%.`;
  if (!result.affected[index].length)
    return "No occupant intersects this zone; keep views open.";
  return `${s.cameraInput.driving ? "Image zone" : "Occupant"} ${result.affected[index].join(", ")} · ${result.reasons[index]} depth · ${s.environment}${s.lightOverride === "off" ? ", lights off" : ""}.`;
}
