// UI-only mirror of the real Web Serial connection state.
// PrototypeConnection.jsx owns the FacadeSerial instance and publishes its
// actual state here so the header badge, hero and welcome card can show it.
// Nothing in this file talks to the ESP32 or changes the serial protocol.

const listeners = new Set();
let state = {
  phase: "idle", // idle | connecting | connected | error
  status: "Disconnected",
  error: "",
  armed: false,
  supported: typeof navigator !== "undefined" && "serial" in navigator,
};
let connectHandler = null;

export const connectionStore = {
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  getSnapshot() {
    return state;
  },
  publish(patch) {
    const next = { ...state, ...patch };
    if (Object.keys(next).every((k) => next[k] === state[k])) return;
    state = next;
    listeners.forEach((fn) => fn());
  },
  // Registered by PrototypeConnection: its own existing connect() workflow.
  registerConnect(fn) {
    connectHandler = fn;
    return () => {
      if (connectHandler === fn) connectHandler = null;
    };
  },
  // Must be called directly from a click handler so the browser's
  // user-gesture requirement for navigator.serial.requestPort() is met.
  requestConnect() {
    if (connectHandler) connectHandler();
    return Boolean(connectHandler);
  },
};

export const PHASE_LABEL = {
  idle: "Not Connected",
  connecting: "Connecting",
  connected: "Connected",
  error: "Connection Error",
};
