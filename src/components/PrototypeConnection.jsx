import { useEffect, useRef, useState } from "react";
import {
  Usb,
  Cable,
  MonitorSmartphone,
  MousePointerClick,
  Unplug,
  Power,
  PowerOff,
  ShieldAlert,
  Cpu,
  CircleAlert,
  CheckCircle2,
  Loader2,
  ChevronDown,
} from "lucide-react";
import {
  FacadeSerial,
  MOTOR_COUNT,
  openingToAngle,
} from "../hardware/serial.js";
import { connectionStore, PHASE_LABEL } from "../hardware/connectionStore.js";

export default function PrototypeConnection({ s }) {
  const [status, setStatus] = useState("Disconnected");
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const [armed, setArmed] = useState(false);
  const [reversed, setReversed] = useState([false, false, false, false]);
  const [lastMessage, setLastMessage] = useState("No physical commands sent");
  const [deviceInfo, setDeviceInfo] = useState("");
  const serialRef = useRef(null);
  const armedRef = useRef(false);
  const lastAngles = useRef([]);
  const queueRef = useRef(Promise.resolve());
  const generation = useRef(0);

  const angles = s.commands.map((opening, i) =>
    openingToAngle(opening, reversed[i]),
  );
  const signature = angles.join(",");
  const fourModules = s.room.modules === MOTOR_COUNT && angles.length === MOTOR_COUNT;

  function disarm(message = "Physical movement disabled") {
    armedRef.current = false;
    setArmed(false);
    generation.current += 1;
    setStatus(message);
  }

  async function disconnect() {
    disarm("Disconnected");
    const device = serialRef.current;
    serialRef.current = null;
    setConnected(false);
    setDeviceInfo("");
    if (device) await device.disconnect();
  }

  async function connect() {
    if (!fourModules) {
      setError("Select a room with exactly four facade modules first.");
      return;
    }
    setError("");
    setStatus("Connecting to ESP32…");
    const device = new FacadeSerial((reason) => {
      if (serialRef.current !== device) return;
      setError(reason?.message || "ESP32 disconnected");
      void disconnect();
    });
    serialRef.current = device;
    try {
      await device.connect();
      if (serialRef.current !== device) return;
      setConnected(true);
      setStatus("ESP32 connected · 4 motors detected · movement disabled");
      try {
        const info = device.port?.getInfo?.() || {};
        const hex = (n) => n.toString(16).toUpperCase().padStart(4, "0");
        setDeviceInfo(
          info.usbVendorId !== undefined
            ? `USB ${hex(info.usbVendorId)}:${hex(info.usbProductId ?? 0)}`
            : "",
        );
      } catch {
        setDeviceInfo("");
      }
    } catch (err) {
      setError(err.message || "Could not connect to ESP32");
      if (serialRef.current === device) await disconnect();
    }
  }

  function enable() {
    if (!connected || !fourModules) return;
    // No servo movement when arming. Only subsequent changes or explicit tests move motors.
    lastAngles.current = [...angles];
    armedRef.current = true;
    setArmed(true);
    setStatus("Physical control enabled · awaiting a target change");
    setError("");
  }

  function send(motor, angle) {
    const token = generation.current;
    queueRef.current = queueRef.current.then(async () => {
      if (token !== generation.current || !armedRef.current || !serialRef.current) return;
      await serialRef.current.send(motor, angle);
      if (token !== generation.current) return;
      lastAngles.current[motor - 1] = angle;
      setLastMessage(`Motor ${motor} → ${angle}° · ESP32 replied OK`);
    }).catch((err) => {
      if (token !== generation.current) return;
      setError(err.message || "Servo command failed");
      disarm("Physical control disabled after communication error");
    });
    return queueRef.current;
  }

  useEffect(() => {
    if (!armedRef.current || !connected || !fourModules) return;
    // Coalesce frequent slider/camera updates. Never stream 3D animation frames.
    const timer = setTimeout(() => {
      const current = signature.split(",").map(Number);
      for (let i = 0; i < MOTOR_COUNT; i++) {
        if (current[i] !== lastAngles.current[i]) void send(i + 1, current[i]);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [signature, connected, fourModules]);

  useEffect(() => {
    if (armedRef.current && !fourModules) {
      disarm("Physical control disabled: room no longer has four modules");
    }
  }, [fourModules]);

  useEffect(() => () => {
    armedRef.current = false;
    generation.current += 1;
    void serialRef.current?.disconnect();
  }, []);

  const connecting = status.startsWith("Connecting");
  const supported = typeof navigator !== "undefined" && "serial" in navigator;
  const phase = connected
    ? "connected"
    : connecting
      ? "connecting"
      : error
        ? "error"
        : "idle";

  // Publish the real connection state for the header badge and welcome card.
  useEffect(() => {
    connectionStore.publish({ phase, status, error, armed, supported });
  }, [phase, status, error, armed, supported]);

  // Let the welcome card and hero buttons start this same connect() workflow.
  const connectRef = useRef(connect);
  connectRef.current = connect;
  useEffect(
    () =>
      connectionStore.registerConnect(() => {
        if (!serialRef.current) void connectRef.current();
      }),
    [],
  );

  const PhaseIcon =
    phase === "connected"
      ? CheckCircle2
      : phase === "connecting"
        ? Loader2
        : phase === "error"
          ? CircleAlert
          : Unplug;

  return (
    <div className="prototype-connection apf-proto">
      <div className="apf-proto-grid">
        <div className={"apf-card apf-proto-main phase-" + phase}>
          <div className="apf-proto-status">
            <span className={"apf-status-pill phase-" + phase} role="status">
              <PhaseIcon size={15} className={phase === "connecting" ? "apf-spin" : ""} />
              {PHASE_LABEL[phase]}
            </span>
            <span className="status-badge">{status}</span>
          </div>

          <div className="apf-device">
            <div className="apf-device-icon" aria-hidden="true">
              <Cpu size={26} />
            </div>
            <div>
              <strong>ESP32-S3 · PCA9685 · 4 servo motors</strong>
              <span>
                {connected
                  ? `Device responded FACADE_READY,4${deviceInfo ? " · " + deviceInfo : ""} · 115200 baud`
                  : "No device connected. The website works fully without hardware."}
              </span>
            </div>
          </div>

          {!supported && (
            <div className="apf-compat" role="note">
              <MonitorSmartphone size={18} />
              <p>
                <strong>USB connection isn’t available in this browser.</strong>{" "}
                Web Serial needs desktop Chrome or Edge on localhost or HTTPS.
                Phones, tablets, Safari and Firefox can still explore every
                simulation and camera feature.
              </p>
            </div>
          )}
          {!fourModules && (
            <p className="prototype-warning" role="alert">
              The physical prototype has four motors. Select a four-module room in Room Designer.
            </p>
          )}

          <div className="prototype-actions apf-proto-actions">
            {!connected ? (
              <button
                className="future-connect apf-btn apf-btn-primary apf-btn-xl"
                disabled={!fourModules || connecting}
                onClick={connect}
              >
                {connecting ? <Loader2 size={20} className="apf-spin" /> : <Usb size={20} />}
                {connecting ? "Connecting…" : "Connect via USB"}
              </button>
            ) : (
              <>
                {!armed ? (
                  <button
                    className="future-connect apf-btn apf-btn-primary"
                    disabled={!fourModules}
                    onClick={enable}
                  >
                    <Power size={18} /> Enable physical control
                  </button>
                ) : (
                  <button className="future-connect apf-btn apf-btn-warn" onClick={() => disarm()}>
                    <PowerOff size={18} /> Stop sending motor commands
                  </button>
                )}
                <button className="future-connect apf-btn apf-btn-ghost" onClick={() => void disconnect()}>
                  <Unplug size={18} /> Disconnect ESP32
                </button>
              </>
            )}
          </div>
          {error && <p className="prototype-error" role="alert">{error}</p>}
          <p className="small-note">
            Connecting does not move motors. Enabling control does not move motors.
            After enabling, changes to Manual sliders or Auto/Camera targets send
            commands to the corresponding motor. Stop sending does not cut motor power.
          </p>
          <p className="small-note apf-last" role="status">{lastMessage}</p>
        </div>

        <div className="apf-card apf-proto-steps">
          <span className="apf-kicker">Three steps</span>
          <ol className="apf-steps">
            <li>
              <span className="apf-step-icon"><Cable size={20} /></span>
              <div>
                <strong>Plug in</strong>
                <p>Connect the ESP32-S3 to your computer using a USB data cable.</p>
              </div>
            </li>
            <li>
              <span className="apf-step-icon"><MonitorSmartphone size={20} /></span>
              <div>
                <strong>Open in a compatible browser</strong>
                <p>Use desktop Chrome or Edge on localhost or an HTTPS address.</p>
              </div>
            </li>
            <li>
              <span className="apf-step-icon"><MousePointerClick size={20} /></span>
              <div>
                <strong>Connect and choose the port</strong>
                <p>Click Connect via USB and select the ESP32’s device or serial port.</p>
              </div>
            </li>
          </ol>
          <p className="prototype-warning">
            <ShieldAlert size={15} className="apf-inline-icon" />
            Before moving motors: use a verified regulated 5V servo supply, remove
            any obstructing linkage, and keep fingers clear. Do not connect an
            unregulated two-cell lithium battery holder directly to servo V+.
            Firmware does not command movement at boot. Test each motor with linkages detached first.
          </p>
        </div>
      </div>

      <details className="apf-card apf-advanced">
        <summary>
          <span>Calibration, motor test & setup details</span>
          <ChevronDown size={16} className="chevron" />
        </summary>
        <div className="apf-advanced-body">
          <p className="small-note">
            ESP32-S3 + PCA9685, four SG90 motors on channels 0–3. Connect using
            desktop Chrome or Edge at localhost/HTTPS. The website works without hardware.
          </p>
          <div className="apf-table-wrap">
            <table className="data-table">
              <thead><tr><th>Panel</th><th>Website</th><th>Panel target (approx.)</th><th>Servo command</th><th>Reverse</th></tr></thead>
              <tbody>
                {angles.map((angle, i) => (
                  <tr key={i}>
                    <th>M{i + 1}</th>
                    <td>{Math.round(s.commands[i])}%</td>
                    <td>{Math.round(angle / 2)}°</td>
                    <td>{angle}°</td>
                    <td>
                      <input type="checkbox" checked={reversed[i]}
                        aria-label={`Reverse motor ${i + 1} direction`}
                        onChange={(e) => setReversed((old) => old.map((v, j) => j === i ? e.target.checked : v))}/>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="small-note">Calibration based on your test: 0% opening → servo 0 (panel ~0°), 100% → servo 180 (panel ~90°). Actual travel is not measured. Reverse individual motors if needed; stop if panels bind.</p>
          <code className="serial-preview">{angles.map((a, i) => `${i + 1},${a}`).join("  |  ")}</code>
          <div className="prototype-test">
            <strong>Test one motor at a time</strong>
            <p className="small-note">Only available after you enable physical control. Keep the facade linkage detached for the first test.</p>
            {Array.from({ length: MOTOR_COUNT }, (_, i) => (
              <div className="prototype-test-row" key={i}>
                <span>Motor {i + 1}</span>
                {[0, 90, 180].map((angle) => (
                  <button key={angle} disabled={!armed || !fourModules}
                    onClick={() => void send(i + 1, angle)}>{angle / 2}° panel</button>
                ))}
              </div>
            ))}
          </div>
          <details className="nested-details">
            <summary>Setup instructions</summary>
            <ol className="connection-steps">
              <li>Upload <code>firmware/ESP32S3_Facade_WebSerial.ino</code> from Arduino IDE.</li>
              <li>Close Arduino IDE Serial Monitor before connecting the website.</li>
              <li>Run the website on localhost using <code>npm run dev</code> in Chrome/Edge.</li>
              <li>Click Connect via USB and select the correct USB COM port.</li>
              <li>Click Enable physical control. Try Motor 1 → 45° panel (servo command 90).</li>
              <li>Switch to Manual and move the facade panel sliders. Auto and camera mode use the same motor link when enabled.</li>
            </ol>
          </details>
          <p className="small-note">“OK” means the ESP32 accepted a command; it does not measure the actual servo position. This is an academic prototype, not a building safety controller.</p>
        </div>
      </details>
    </div>
  );
}
