# Live ESP32-S3 / PCA9685 integration (2026-11-09)

This version implements **opt-in Web Serial** in `src/components/PrototypeConnection.jsx` and `src/hardware/serial.js`. Upload `firmware/ESP32S3_Facade_WebSerial.ino` before connecting. The site remains functional in simulation-only mode.

The page uses `HELLO\n` → `FACADE_READY,4\n` for device verification. Servo commands range from `1,0\n` through `4,180\n`, each acknowledged with `OK\n`. The website maps 0–100% opening (approximately 0–90° of panel movement as observed) to servo commands 0–180° (optionally reversed per motor), independently of the previous illustrative 0–90° preview. Commands are debounced at 250ms and serialized. Connection and arming are separate user actions.

**Safety:** The Arduino sketch does not command movement on boot; detach linkages before initial testing. Use only a verified regulated 5V servo supply. A raw two-cell lithium battery pack may be unsafe. The site disarms on communication errors but does not provide a physical emergency stop or feedback.

For complete setup instructions, see the new README section **Connect the real four-motor ESP32-S3 prototype**.

---

## Original design notes

# Future physical prototype connection

This document describes the integration boundary. No serial connection or motor control is implemented in this release. The website works with no device connected.

## Current single source of truth

`Simulation.state.commands` contains accepted facade-opening targets. Automatic control, manual sliders and the safety demonstration all write through the same engine. `actualCommands` is the smoothed visual pose and should not be streamed every animation frame.

`hardwarePacket(commands, calibration)` in `src/simulation/control.js` maps targets through independent per-module endpoints:

```js
const angle =
  closedDegrees + ((openDegrees - closedDegrees) * openingPercent) / 100;
```

Values are limited to 0–180° and rounded for the preview. Reversed endpoints are supported. Default endpoints are 0° closed and 90° open; these are illustrative and must be replaced with physical measurements. The 3D mechanism's 86° maximum folding angle is unrelated to these servo endpoints.

Example packet:

```json
{
  "version": 1,
  "source": "simulation",
  "calibrated": false,
  "modules": [
    { "id": "M1", "openingPercent": 100, "targetServoDegrees": 90 },
    { "id": "M2", "openingPercent": 50, "targetServoDegrees": 45 }
  ],
  "serialPreview": "M1:90,M2:45"
}
```

Only active modules are included. Changing from four modules to two is a simulation operation; a future physical adapter must require the configured module count to match the connected prototype rather than silently remapping motors.

## Suggested future adapter responsibilities

1. Show a user-operated Connect button and request the serial device only after that click, in a supported browser on localhost/HTTPS.
2. Identify the firmware and confirm the physical module count. Show Connected only after an actual successful handshake.
3. Subscribe to accepted engine target changes, not React renders or each animated pose.
4. Coalesce/rate-limit changes and send one newline-terminated line, for example `M1:90,M2:45,M3:20,M4:90\n`.
5. Validate motor ranges and movement rate in firmware as well as in the browser. Add acknowledgement, timeout and disconnect handling.
6. Keep opening targets, commanded angles and acknowledged physical position separate. Without feedback, an angle request does not prove the motor reached it.
7. Validate the model's power supply, linkage, mechanical clearance and motor limits before applying movement. The existing safety override is only an academic demonstration and must not be treated as a real safety controller.

Before such an adapter and firmware exist, **manual website changes affect the digital model only**. Plugging in a cable cannot make the present application detect or control the microcontroller.
