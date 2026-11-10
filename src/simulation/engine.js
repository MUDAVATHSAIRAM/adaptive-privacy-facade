import {
  distance,
  findDestination,
  insidePath,
  zoneOf,
  zoneLabel,
  blocked,
} from "./navigation.js";
import { STORY } from "./story.js";

export const MAX_PEOPLE = 21;
import {
  DEFAULT_ROOM,
  normalizeRoom,
  ROOM_PRESETS,
  roomPoint,
  encodeRoom,
  decodeRoom,
  ROOM_STORAGE_KEY,
  capacityForRoom,
} from "./roomConfig.js";
import {
  BASELINES,
  DEFAULT_CONTROL,
  affectedModules,
  autoCommands,
  controlActors,
  moduleExplanation,
  hardwarePacket,
  freeArea,
  exposureEstimate,
} from "./control.js";
export { BASELINES, affectedModules, autoCommands };
export const CAMERAS = [
  ["perspective", "Perspective"],
  ["interior", "Interior"],
  ["exterior", "Exterior"],
  ["observer", "Observer"],
  ["plan", "Top / plan"],
  ["section", "Section"],
  ["detail", "Facade detail"],
  ["elevation", "Facade elevation"],
];
export const PRESETS = [
  ["empty", "Open / empty"],
  ["individual", "Day / individual"],
  ["near", "Near window"],
  ["small", "Small group"],
  ["shared", "Shared studio"],
  ["full", "Full capacity"],
  ["night", "Night privacy"],
  ["street", "Street view"],
];
const copy = (value) => JSON.parse(JSON.stringify(value));
const clamp = (n, min = 0, max = 100) => Math.max(min, Math.min(max, n));
export class Simulation {
  constructor() {
    this.listeners = new Set();
    this.state = {
      room: { ...DEFAULT_ROOM },
      control: { ...DEFAULT_CONTROL },
      safety: { active: false, previous: null },
      cameraInput: {
        active: false,
        driving: false,
        detections: [],
        status: "off",
      },
      calibration: Array.from({ length: 4 }, () => ({ closed: 0, open: 90 })),
      pending: [],
      actors: [],
      targetCount: 0,
      nextId: 1,
      selected: null,
      environment: "day",
      lightOverride: "auto",
      mode: "auto",
      commands: [100, 100, 100, 100],
      actualCommands: [100, 100, 100, 100],
      reasons: [null, null, null, null],
      camera: "perspective",
      cameraRevision: 0,
      selectedModule: null,
      observer: { x: 0.8, z: -5.5, visible: true },
      surroundings: {
        trees: true,
        vehicles: true,
        people: true,
        population: 6,
        motion: true,
      },
      quality: "auto",
      analysis: false,
      exposure: null,
      sightResults: [],
      compare: false,
      compareView: "exterior",
      compareCondition: "filtered",
      compareReturn: null,
      perforation: false,
      dimensions: false,
      planInset: false,
      form: null,
      formReturn: null,
      presentation: false,
      demo: null,
      reducedMotion: false,
      elapsed: 0,
      exteriorTime: 0,
      lightMix: 0,
      preset: "empty",
      notice: "",
      admissionAt: 0,
    };
    this.lastEmit = 0;
    this.autoTimer = 0;
    this.candidates = [];
    this.demoBackup = null;
    this.frameStats = { fps: null, samples: 0, seconds: 0 };
    this.snapshot = this.makeSnapshot();
  }
  subscribe = (fn) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  getSnapshot = () => this.snapshot;
  makeSnapshot() {
    const s = this.state;
    const actual = s.actors.filter((p) => p.inside).length;
    const entering = s.actors.filter((p) => p.wanted && !p.inside).length;
    const leaving = s.actors.filter((p) => !p.wanted && p.inside).length;
    const person = s.actors.find((p) => p.id === s.selected && p.inside);
    return {
      ...s,
      actors: s.actors.map((p) => ({
        id: p.id,
        inside: p.inside,
        wanted: p.wanted,
      })),
      count: actual,
      capacity: capacityForRoom(s.room),
      entering,
      leaving,
      reserved: s.actors.length,
      person: person
        ? {
            id: person.id,
            zone: zoneOf(person.z, s.room),
            x: person.x,
            z: person.z,
          }
        : null,
      commands: [...s.commands],
      actualCommands: [...s.actualCommands],
      observer: { ...s.observer },
      surroundings: { ...s.surroundings },
      demo: s.demo ? { ...s.demo } : null,
      positions: s.actors
        .filter((p) => p.inside)
        .map((p) => ({ id: p.id, x: p.x, z: p.z })),
      fps: this.frameStats.fps,
      room: { ...s.room },
      control: { ...s.control },
      safety: { ...s.safety },
      cameraInput: {
        ...s.cameraInput,
        detections: [...s.cameraInput.detections],
      },
      pending: [...s.pending],
      hardware: hardwarePacket(s.commands, s.calibration),
      metrics: this.metrics(),
    };
  }
  metrics() {
    const s = this.state,
      actors = controlActors(s);
    const adaptive = autoCommands(
      actors,
      s.environment,
      s.observer,
      s.room,
      s.control,
      s.lightOverride,
    );
    const estimate = (commands) =>
      exposureEstimate(
        actors,
        s.observer,
        commands,
        s.room,
        s.environment,
        s.lightOverride,
      );
    return {
      controlCount: actors.filter((p) => p.inside).length,
      freeOpening:
        s.actualCommands.reduce((sum, c) => sum + freeArea(c, s.room), 0) /
        s.room.modules,
      exposure: estimate(s.actualCommands),
      comparison: [
        { label: "Open", commands: Array(s.room.modules).fill(100) },
        { label: "Adaptive", commands: adaptive.commands },
        { label: "Closed", commands: Array(s.room.modules).fill(0) },
      ].map((item) => ({
        ...item,
        exposure: estimate(item.commands),
        opening:
          item.commands.reduce((sum, c) => sum + freeArea(c, s.room), 0) /
          s.room.modules,
      })),
      explanations: s.commands.map((_, i) => moduleExplanation(s, i, adaptive)),
      affected: adaptive.affected,
    };
  }
  setRoom(patch, preset = "custom") {
    const s = this.state;
    if (s.demo || s.compare || s.form !== null || s.safety.active) {
      this.change({
        notice:
          "Exit the demonstration, comparison or override before editing the room.",
      });
      return;
    }
    const previous = s.room;
    const next = normalizeRoom({ ...previous, ...patch, preset });
    const spatial = ["width", "length"].some((k) => previous[k] !== next[k]);
    s.room = next;
    if (spatial) {
      const capacity = capacityForRoom(next);
      if (s.actors.length > capacity) {
        s.actors = s.actors.slice(0, capacity);
        s.targetCount = Math.min(s.targetCount, capacity);
        if (!s.actors.some((p) => p.id === s.selected))
          s.selected = s.actors.find((p) => p.inside)?.id ?? null;
        s.notice = `Smaller room: retained ${capacity} people to fit the simulation crowd limit.`;
      }
      for (const p of s.actors) {
        p.x *= next.width / previous.width;
        p.z *= next.length / previous.length;
        if (p.destination) {
          p.destination.x *= next.width / previous.width;
          p.destination.z *= next.length / previous.length;
          p.destination.zone = zoneOf(p.destination.z, next);
        }
      }
      // Resizing is a layout operation: refit occupants to separated, clear destinations.
      // Normal occupant moves still animate through the pathfinder.
      const assigned = [];
      for (const p of s.actors) {
        const destination =
          findDestination(assigned, p.destination?.zone, p.id, p.id, next) ||
          findDestination(assigned, null, p.id, p.id, next);
        if (destination) {
          p.destination = destination;
          assigned.push({ id: p.id, wanted: true, destination });
          if (p.inside) {
            p.x = destination.x;
            p.z = destination.z;
            p.wait = 0;
            p.path = [];
          }
        }
      }
      for (const p of s.actors) this.routeActor(p);
    }
    s.commands = Array.from(
      { length: next.modules },
      (_, i) => s.commands[i] ?? 100,
    );
    s.actualCommands = Array.from(
      { length: next.modules },
      (_, i) => s.actualCommands[i] ?? 100,
    );
    s.reasons = Array(next.modules).fill(null);
    s.pending = [];
    this.candidates = [];
    if (s.selectedModule >= next.modules) s.selectedModule = null;
    s.cameraRevision++;
    this.emit();
  }
  roomPreset(key) {
    if (ROOM_PRESETS[key])
      this.setRoom({ ...DEFAULT_ROOM, ...ROOM_PRESETS[key].room }, key);
  }
  saveRoom() {
    try {
      localStorage.setItem(ROOM_STORAGE_KEY, encodeRoom(this.state.room));
      this.change({ notice: "Room saved on this browser." });
    } catch {
      this.change({
        notice: "Browser storage is unavailable. The current room still works.",
      });
    }
  }
  loadRoom() {
    try {
      const text = localStorage.getItem(ROOM_STORAGE_KEY);
      if (!text)
        return this.change({
          notice: "No saved room yet. Use Save room first.",
        });
      const room = decodeRoom(text);
      this.setRoom(room, room.preset);
      this.change({ notice: "Saved room restored." });
    } catch {
      this.change({
        notice: "Could not read the saved room. Choose a preset to continue.",
      });
    }
  }
  moveSelectedTo(x, z) {
    const s = this.state,
      p = s.actors.find((a) => a.id === s.selected && a.inside && a.wanted);
    if (
      !p ||
      !Number.isFinite(x) ||
      !Number.isFinite(z) ||
      s.compare ||
      s.cameraInput.driving
    )
      return;
    if (
      x < -s.room.width / 2 + 0.4 ||
      x > s.room.width / 2 - 0.4 ||
      z < 0.55 ||
      z > s.room.length - 0.6 ||
      blocked(x, z, 0.28, s.room) ||
      s.actors.some(
        (o) =>
          o.id !== p.id &&
          o.wanted &&
          (distance([x, z], [o.x, o.z]) < 0.6 ||
            (o.destination &&
              distance([x, z], [o.destination.x, o.destination.z]) < 0.6)),
      )
    ) {
      this.change({
        notice:
          "Choose a clear floor position away from furniture, walls and people.",
      });
      return;
    }
    const path = insidePath([p.x, p.z], [x, z], s.actors, p.id, s.room);
    if (!path.length)
      return this.change({
        notice: "No clear route to this point. Try a nearby position.",
      });
    p.destination = { x, z, zone: zoneOf(z, s.room) };
    p.path = path;
    this.emit();
  }
  setControl(patch) {
    const s = this.state;
    for (const [key, value] of Object.entries(patch)) {
      if (!(key in DEFAULT_CONTROL) || !Number.isFinite(Number(value)))
        continue;
      s.control[key] =
        key === "stabilityDelay"
          ? clamp(Number(value), 0.2, 2)
          : clamp(Number(value));
    }
    if (s.safety.active)
      s.commands = Array(s.room.modules).fill(s.control.safetyOpening);
    this.emit();
  }
  setSafety(active) {
    const s = this.state;
    if (active === s.safety.active) return;
    if (active) {
      if (s.demo) this.exitDemo();
      if (s.compare) this.setCompare(false);
      if (s.form !== null) this.formStage(null);
      this.state.safety = {
        active: true,
        previous: { mode: this.state.mode, commands: [...this.state.commands] },
      };
      this.state.commands = Array(this.state.room.modules).fill(
        this.state.control.safetyOpening,
      );
    } else {
      Object.assign(s, s.safety.previous);
      s.safety = { active: false, previous: null };
      this.candidates = [];
    }
    this.emit();
  }
  setCameraInput(patch) {
    Object.assign(this.state.cameraInput, patch);
    if (!this.state.cameraInput.active) this.state.cameraInput.driving = false;
    if (
      this.state.cameraInput.driving &&
      this.state.mode !== "auto" &&
      !this.state.safety.active
    )
      this.setMode("auto");
    this.emit();
  }
  emit() {
    this.snapshot = this.makeSnapshot();
    this.listeners.forEach((fn) => fn());
  }
  change(patch) {
    Object.assign(this.state, patch);
    this.emit();
  }
  plus() {
    if (
      this.state.actors.length < capacityForRoom(this.state.room) ||
      this.state.actors.some((p) => !p.wanted)
    )
      this.setTarget(this.state.targetCount + 1);
  }
  minus() {
    this.setTarget(this.state.targetCount - 1, this.state.selected);
  }
  setTarget(number, preferId = null, preferredZone = null) {
    if (!Number.isFinite(number)) return;
    const s = this.state,
      target = Math.round(clamp(number, 0, capacityForRoom(s.room)));
    s.targetCount = target;
    let wanted = s.actors.filter((p) => p.wanted);
    if (wanted.length > target) {
      // The selected person leaves first; otherwise use latest accepted identity.
      wanted.sort((a, b) =>
        a.id === preferId ? -1 : b.id === preferId ? 1 : b.id - a.id,
      );
      for (const p of wanted.slice(0, wanted.length - target)) {
        p.wanted = false;
        p.exitPriority = s.exitSequence = (s.exitSequence || 0) + 1;
        p.exitingStarted = false;
        if (!p.visible && !p.inside) {
          s.actors = s.actors.filter((a) => a.id !== p.id);
          continue;
        }
        this.routeActor(p);
      }
    }
    if (s.actors.filter((p) => p.wanted).length < target) {
      for (const p of s.actors.filter((p) => !p.wanted && p.inside)) {
        if (s.actors.filter((a) => a.wanted).length >= target) break;
        p.wanted = true;
        p.destination =
          findDestination(
            s.actors,
            preferredZone || zoneOf(p.z, s.room),
            p.id,
            p.id,
            s.room,
          ) || findDestination(s.actors, null, p.id, p.id, s.room);
        this.routeActor(p);
      }
    }
    this.admit(preferredZone);
    if (preferredZone) s.preferredZone = preferredZone;
    if (!target) s.preferredZone = null;
    this.emit();
  }
  admit(preferredZone) {
    const s = this.state;
    let needed = s.targetCount - s.actors.filter((p) => p.wanted).length;
    while (needed > 0 && s.actors.length < capacityForRoom(s.room)) {
      const id = s.nextId++;
      const zone =
        preferredZone ||
        ["center", "near", "rear"][s.actors.filter((p) => p.wanted).length % 3];
      const destination =
        findDestination(s.actors, zone, id, id, s.room) ||
        findDestination(s.actors, null, id, id, s.room);
      if (!destination) break;
      const p = {
        id,
        x: (7.1 * s.room.width) / 10,
        z: (6.75 * s.room.length) / 8,
        inside: false,
        wanted: true,
        visible: false,
        destination,
        path: [],
        heading: -Math.PI / 2,
        walk: 0,
        moving: false,
        wait: 0,
        retry: 0,
        startAt: Math.max(s.elapsed + 0.1, s.admissionAt),
        height: 0.94 + (id % 5) * 0.027,
      };
      s.admissionAt = p.startAt + 0.86;
      s.actors.push(p);
      this.routeActor(p);
      needed--;
    }
  }
  routeActor(p, dynamic = true) {
    const actors = dynamic ? this.state.actors : [];
    const room = this.state.room,
      point = (x, z) => roomPoint(x, z, room);
    if (p.wanted) {
      const destination = [p.destination.x, p.destination.z];
      if (!p.inside) {
        const lane = { near: 1.85, center: 3.95, rear: 6.15 }[
          p.destination.zone
        ];
        p.path = [
          point(5.65, 6.75),
          point(4.35, 6.75),
          point(4.35, lane),
          [p.destination.x, (lane * room.length) / 8],
          destination,
        ];
      } else p.path = insidePath([p.x, p.z], destination, actors, p.id, room);
    } else if (p.inside) {
      if (p.x > (4.1 * room.width) / 10 && p.z > (6.2 * room.length) / 8)
        p.path = [point(5.7, 6.75), point(7.65, 6.75)];
      else {
        const path = insidePath(
          [p.x, p.z],
          point(4.75, 6.75),
          actors,
          p.id,
          room,
        );
        p.path = path.length
          ? [...path, point(5.7, 6.75), point(7.65, 6.75)]
          : [];
      }
    } else p.path = [point(7.65, 6.75)];
    p.retry = 0;
  }
  select(id) {
    if (!this.state.actors.some((p) => p.id === id && p.inside)) return;
    this.change({ selected: id });
  }
  moveSelected(zone) {
    if (this.state.cameraInput.driving || this.state.compare) return;
    const p = this.state.actors.find(
      (a) => a.id === this.state.selected && a.inside && a.wanted,
    );
    if (!p) return;
    const d = findDestination(
      this.state.actors,
      zone,
      p.id,
      p.id,
      this.state.room,
    );
    if (!d)
      return this.change({
        notice: "All destinations in this zone are reserved.",
      });
    p.destination = d;
    this.routeActor(p);
    this.emit();
  }
  setMode(mode) {
    if (this.state.safety.active) return;
    if (mode !== "auto" && mode !== "manual") return;
    if (mode === "manual") {
      this.state.commands = [...this.state.actualCommands];
      this.state.cameraInput.driving = false;
    }
    this.change({ mode, preset: null });
  }
  setOpening(value, index = null) {
    if (this.state.safety.active) return;
    if (!Number.isFinite(Number(value))) return;
    if (this.state.mode !== "manual") this.setMode("manual");
    if (index === null)
      this.state.commands = Array(this.state.room.modules).fill(
        clamp(Number(value)),
      );
    else if (
      Number.isInteger(index) &&
      index >= 0 &&
      index < this.state.room.modules
    )
      this.state.commands[index] = clamp(Number(value));
    this.emit();
  }
  setCamera(camera) {
    if (!CAMERAS.some((c) => c[0] === camera)) return;
    this.change({ camera, cameraRevision: this.state.cameraRevision + 1 });
  }
  setObserver(patch) {
    Object.assign(this.state.observer, patch);
    this.state.observer.x = clamp(this.state.observer.x, -4.5, 4.5);
    this.state.observer.z = clamp(this.state.observer.z, -7.3, -3.65);
    this.state.cameraRevision++;
    this.emit();
  }
  setSurroundings(patch) {
    Object.assign(this.state.surroundings, patch);
    this.emit();
  }
  resetSurroundings() {
    this.state.exteriorTime = 0;
    this.setSurroundings({
      trees: true,
      vehicles: true,
      people: true,
      population: 6,
      motion: true,
    });
  }
  setCompare(enabled) {
    if (enabled && this.state.safety.active) return;
    if (enabled && this.state.cameraInput.active) {
      this.stopCamera?.();
      this.setCameraInput({ active: false, detections: [], status: "off" });
    }
    const s = this.state;
    if (enabled === s.compare) return;
    if (enabled) {
      s.compareReturn = {
        camera: s.camera,
        analysis: s.analysis,
        perforation: s.perforation,
      };
      s.camera = s.compareView;
      s.analysis = false;
      s.perforation = false;
    } else if (s.compareReturn) {
      Object.assign(s, s.compareReturn);
      s.compareReturn = null;
    }
    s.compare = enabled;
    s.cameraRevision++;
    this.emit();
  }
  compareCamera(camera) {
    if (!["interior", "exterior"].includes(camera)) return;
    this.change({ compareView: camera });
    this.setCamera(camera);
  }
  formStage(stage) {
    if (stage !== null && this.state.safety.active) return;
    if (stage !== null) this.state.cameraInput.driving = false;
    const s = this.state;
    if (stage === null) {
      if (s.formReturn) Object.assign(s, s.formReturn);
      s.form = null;
      s.formReturn = null;
      s.cameraRevision++;
      this.emit();
      return;
    }
    if (s.form === null)
      s.formReturn = {
        camera: s.camera,
        mode: s.mode,
        commands: [...s.commands],
        perforation: s.perforation,
      };
    s.form = stage;
    s.camera = "detail";
    s.cameraRevision++;
    s.perforation = stage === 1;
    if (stage < 4) {
      s.mode = "manual";
      s.commands =
        stage < 2
          ? [0, 0, 0, 0]
          : stage === 2
            ? [55, 55, 55, 55]
            : [20, 50, 75, 95];
    } else s.mode = "auto";
    s.commands = s.commands.slice(0, s.room.modules);
    this.emit();
  }
  preset(key) {
    if (this.state.safety.active) return;
    if (this.state.demo) this.exitDemo();
    const s = this.state;
    s.cameraInput.driving = false;
    if (s.compare) this.setCompare(false);
    if (s.form !== null) this.formStage(null);
    s.perforation = false;
    s.analysis = false;
    s.preferredZone = null;
    s.preset = key;
    const table = {
      empty: [0, "day", "perspective"],
      individual: [1, "day", "perspective", "center"],
      near: [1, "day", "exterior", "near"],
      small: [7, "day", "perspective"],
      shared: [14, "evening", "perspective"],
      full: [21, "day", "perspective"],
      night: [21, "night", "exterior"],
    };
    if (key === "street") {
      this.setCamera("observer");
      this.resetSurroundings();
      return;
    }
    if (!table[key]) return;
    const [count, env, camera, zone] = table[key];
    s.mode = "auto";
    s.environment = env;
    this.setCamera(camera);
    this.setTarget(count, null, zone);
    if (zone && s.selected) this.moveSelected(zone);
    this.emit();
  }
  save() {
    return copy(this.state);
  }
  restore(saved) {
    this.state = copy(saved);
    this.candidates = [];
    this.state.cameraRevision++;
    this.emit();
  }
  startDemo() {
    if (this.state.demo || this.state.safety.active) return;
    if (this.state.cameraInput.active) {
      this.stopCamera?.();
      this.setCameraInput({ active: false, detections: [], status: "off" });
    }
    this.demoBackup = this.save();
    if (this.state.compare) this.setCompare(false);
    if (this.state.form !== null) this.formStage(null);
    // A new presentation opens on its own empty scene; Exit restores the user's room.
    this.state.actors = [];
    this.state.targetCount = 0;
    this.state.selected = null;
    this.state.nextId = 1;
    this.state.admissionAt = this.state.elapsed;
    this.state.demo = { index: 0, time: 0, paused: false };
    this.applyStory(0);
  }
  applyStory(index, seek = false) {
    index = clamp(index, 0, STORY.length - 1);
    const s = this.state,
      story = STORY[index];
    if (s.compare) this.setCompare(false);
    if (s.form !== null) this.formStage(null);
    if (seek) {
      // Scrubbing lands on a reproducible arrival keyframe; normal playback remains animated.
      const count = story.count;
      const rehearsal = new Simulation();
      rehearsal.setRoom(s.room, s.room.preset);
      rehearsal.setTarget(count, null, story.zone || null);
      for (let frame = 0; frame < 3600 && count > 0; frame++)
        rehearsal.tick(1 / 60);
      s.actors = copy(rehearsal.state.actors);
      s.nextId = rehearsal.state.nextId;
      s.targetCount = count;
      s.selected = rehearsal.state.selected;
      s.elapsed = rehearsal.state.elapsed;
      s.admissionAt = s.elapsed;
      s.departureId = null;
    }
    s.demo = { index, time: 0, paused: s.demo?.paused || false };
    s.mode = story.manual ? "manual" : "auto";
    s.analysis = !!story.analysis;
    s.perforation = false;
    s.environment = story.environment;
    s.lightOverride = "auto";
    s.preferredZone = story.zone || null;
    s.observer = { x: 0.8, z: -5.5, visible: true };
    this.resetSurroundings();
    this.setCamera(story.camera);
    this.setTarget(story.count, null, story.zone);
    if (story.zone && s.selected) this.moveSelected(story.zone);
    if (story.manual) s.commands = Array(s.room.modules).fill(75);
    if (seek) {
      if (!story.manual) {
        const result = autoCommands(
          s.actors,
          s.environment,
          s.observer,
          s.room,
          s.control,
          s.lightOverride,
        );
        s.commands = result.commands;
        s.reasons = result.reasons;
      }
      s.actualCommands = [...s.commands];
      s.pending = [];
      this.candidates = [];
      s.lightMix = { day: 0, evening: 1, night: 2 }[s.environment];
    }
    if (story.compare) {
      s.lightMix = { day: 0, evening: 1, night: 2 }[story.environment];
      s.compareView = "exterior";
      this.setCompare(true);
    }
    this.emit();
  }
  stepDemo(direction) {
    if (this.state.demo)
      this.applyStory(this.state.demo.index + direction, true);
  }
  pauseDemo() {
    if (this.state.demo) {
      this.state.demo.paused = !this.state.demo.paused;
      this.emit();
    }
  }
  exitDemo() {
    if (!this.demoBackup) return;
    const saved = this.demoBackup;
    this.demoBackup = null;
    this.restore(saved);
  }
  updateStory(dt) {
    const s = this.state,
      d = s.demo;
    if (!d || d.paused) return;
    const before = d.time;
    d.time += dt;
    const crossed = (t) => before < t && d.time >= t;
    if (d.index === 4) {
      if (crossed(8)) this.setTarget(14);
      if (crossed(17)) this.setTarget(21);
    }
    if (d.index === 7 && crossed(7)) s.environment = "night";
    if (d.index === 9 && crossed(7)) {
      if (s.compare) this.setCompare(false);
      s.analysis = true;
      s.perforation = true;
      this.setCamera("detail");
    }
    if (d.index === 8 && crossed(3)) {
      s.commands[1] = 10;
      s.selectedModule = 1;
    }
    if (d.time >= STORY[d.index].duration) {
      if (d.index < STORY.length - 1) this.applyStory(d.index + 1);
      else {
        d.time = STORY[d.index].duration;
        d.paused = true;
      }
    }
  }
  tick(delta) {
    const dt = Math.min(delta, 0.05),
      s = this.state;
    this.frameStats.samples++;
    this.frameStats.seconds += delta;
    if (this.frameStats.seconds > 2) {
      this.frameStats.fps = Math.round(
        this.frameStats.samples / this.frameStats.seconds,
      );
      this.frameStats.samples = 0;
      this.frameStats.seconds = 0;
    }
    this.updateStory(dt);
    const frozen = s.compare || s.demo?.paused;
    if (!frozen) {
      s.elapsed += dt;
      if (s.surroundings.motion) s.exteriorTime += dt;
      const lightTarget = { day: 0, evening: 1, night: 2 }[s.environment];
      s.lightMix += (lightTarget - s.lightMix) * (1 - Math.exp(-dt * 1.5));
      const departure = s.actors
        .filter((p) => !p.wanted && p.visible && p.path.length)
        .sort((a, b) =>
          a.id === s.departureId
            ? -1
            : b.id === s.departureId
              ? 1
              : a.exitPriority - b.exitPriority,
        )[0];
      s.departureId = departure?.id ?? null;
      for (const p of s.actors) {
        p.moving = false;
        if (!p.visible && s.elapsed >= p.startAt) {
          if (
            s.actors.some(
              (o) =>
                o.id !== p.id &&
                o.visible &&
                distance([o.x, o.z], [p.x, p.z]) < 0.7,
            )
          )
            continue;
          p.visible = true;
        }
        if (!p.visible) continue;
        // Pace departures to keep the doorway and aisle free instead of forming a jam.
        if (!p.wanted && p.inside && departure?.id !== p.id) {
          if (!p.path.length) {
            p.retry += dt;
            if (p.retry > 0.7) this.routeActor(p);
          }
          continue;
        }
        if (!p.wanted && departure?.id === p.id && !p.exitingStarted) {
          p.exitingStarted = true;
          this.routeActor(p);
        }
        if (!p.path.length) {
          const dest = p.wanted
            ? [p.destination.x, p.destination.z]
            : roomPoint(7.65, 6.75, s.room);
          if (distance([p.x, p.z], dest) > 0.15) {
            p.retry += dt;
            if (p.retry > 0.7) this.routeActor(p);
          }
          continue;
        }
        const target = p.path[0],
          len = distance([p.x, p.z], target);
        const speed = 1.3,
          step = Math.min(len, speed * dt);
        if (len < 0.03) {
          p.path.shift();
          continue;
        }
        const x = p.x + ((target[0] - p.x) / len) * step,
          z = p.z + ((target[1] - p.z) / len) * step;
        const conflict = s.actors.some(
          (o) =>
            o.id !== p.id &&
            o.visible &&
            distance([x, z], [o.x, o.z]) < 0.47 &&
            distance([x, z], [o.x, o.z]) <
              distance([p.x, p.z], [o.x, o.z]) - 0.001,
        );
        if (conflict) {
          p.wait += dt;
          p.retry += dt;
          if (p.retry > 0.8 && p.inside) this.routeActor(p);
          continue;
        }
        p.wait = 0;
        p.x = x;
        p.z = z;
        p.heading = Math.atan2(target[0] - p.x, target[1] - p.z);
        p.walk += dt * 7;
        p.moving = true;
        const wasInside = p.inside;
        p.inside =
          p.x < s.room.width / 2 &&
          p.x > -s.room.width / 2 &&
          p.z > 0 &&
          p.z < s.room.length;
        if (p.inside && !wasInside) {
          if (s.selected === null) s.selected = p.id;
          if (s.preferredZone && s.targetCount === 1) {
            p.destination =
              findDestination(s.actors, s.preferredZone, p.id, p.id, s.room) ||
              p.destination;
            this.routeActor(p);
          }
        }
        if (!p.inside && wasInside && s.selected === p.id)
          s.selected =
            s.actors.find((o) => o.inside && o.id !== p.id)?.id ?? null;
      }
      s.actors = s.actors.filter(
        (p) => p.wanted || p.inside || p.x < (7.6 * s.room.width) / 10,
      );
      if (!s.actors.length) s.admissionAt = s.elapsed;
      if (s.actors.filter((p) => p.wanted).length < s.targetCount)
        this.admit(s.preferredZone);
      if (s.mode === "auto" && !s.safety.active) {
        const result = autoCommands(
          controlActors(s),
          s.environment,
          s.observer,
          s.room,
          s.control,
          s.lightOverride,
        );
        s.pending = result.commands.map((value, i) => {
          if (Math.abs(value - s.commands[i]) < 2) {
            this.candidates[i] = null;
            s.reasons[i] = result.reasons[i];
            return false;
          }
          if (
            !this.candidates[i] ||
            Math.abs(this.candidates[i].value - value) >= 2
          )
            this.candidates[i] = { value, time: 0 };
          this.candidates[i].time += dt;
          if (this.candidates[i].time >= s.control.stabilityDelay) {
            s.commands[i] = value;
            s.reasons[i] = result.reasons[i];
            this.candidates[i] = null;
            return false;
          }
          return true;
        });
      } else s.pending = Array(s.room.modules).fill(false);
      for (let i = 0; i < s.room.modules; i++)
        s.actualCommands[i] +=
          (s.commands[i] - s.actualCommands[i]) * (1 - Math.exp(-dt * 3.5));
    }
    this.lastEmit += dt;
    if (this.lastEmit > 0.12) {
      this.lastEmit = 0;
      this.emit();
    }
  }
  getExplanation() {
    const s = this.state;
    if (s.safety.active)
      return "Safety demonstration override active. This is not a validated building safety system.";
    if (s.cameraInput.driving)
      return "Approximate webcam image zones are driving automatic targets.";
    if (s.pending.some(Boolean))
      return "Waiting for a stable occupant zone before moving the panels.";
    if (s.mode === "manual")
      return "Your opening commands control each active module.";
    if (!s.actors.some((p) => p.inside))
      return `Empty room: modules return to ${s.control.emptyOpening}% opening.`;
    const entries = s.reasons
      .map((z, i) => (z ? "0" + (i + 1) : null))
      .filter(Boolean);
    return s.environment === "night"
      ? "Night condition: stronger screening proposed."
      : "Modules " + entries.join(", ") + " respond to occupied sight lines.";
  }
}
export const engine = new Simulation();
