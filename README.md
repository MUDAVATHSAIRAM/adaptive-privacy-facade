> **UI/UX redesign (November 2026):** see [REDESIGN_NOTES.md](REDESIGN_NOTES.md) for what changed, how to run it in VS Code, deploy to Vercel, and connect the ESP32-S3 over USB.

# Adaptive Kinetic Privacy Facade — upgraded VS Code project

An interactive Intelligent Building study for IIT (BHU), Varanasi, developed by **Mudavath Sairam and RVSS Tharun**. This upgrade extends the supplied React + Vite + Three.js project and its existing room, bi-fold mechanism, animated occupants, surroundings, privacy analysis and presentation controls.

**The website runs without an Arduino, and it now also supports optional USB Web Serial control of four SG90 servos through ESP32-S3 + PCA9685.** No backend, database, account or paid API is required. Calculated privacy and opening values are **simulation estimates**, not measured building performance.

## Run it in VS Code

1. Extract the ZIP completely.
2. Open the `adaptive-privacy-facade` folder in VS Code. You should see `package.json` inside this folder.
3. Install Node.js **22.13 or newer** if it is not already installed.
4. Select **Terminal → New Terminal** and run:

```bash
npm install
npm run dev
```

5. Open the URL printed in the terminal, normally **http://localhost:5173**.
6. Leave the terminal running. Press **Ctrl+C** to stop the server.

If PowerShell blocks `npm.ps1`, select **Command Prompt** from the VS Code terminal dropdown, or run:

```bat
npm.cmd install
npm.cmd run dev
```

Do not double-click `index.html`. JavaScript modules need the local server. Internet is needed for the initial npm installation. The normal room simulation then uses local code and procedural assets. Optional camera mode additionally downloads its person-detection model when started.

## A quick classroom demonstration

1. Select **Room Designer → Original studio** for the original 10 × 8 × 3.6 m room with four modules.
2. Keep **Day → Auto** and add one person. The person enters through the door; the indoor count updates after crossing the threshold.
3. Open **People** or **Dashboard**, select an occupant, then click a clear floor-plan position. You can also use Near window / Center / Rear and Move left / Move right.
4. Watch which module zones respond. The default stability delay is 0.7 seconds, followed by a smooth fold transition.
5. Change to **Night**. A lit interior requests stronger screening in affected zones.
6. Choose **Manual → Facade modules**. Set M02 independently; other module commands stay unchanged.
7. Open **Performance Dashboard** to explain the estimated clear opening, exposure index, individual targets and open/adaptive/closed comparison.
8. Try **Privacy analysis** for actual mesh sightline samples and **Compare privacy** for matched 3D views. The comparison can show filtered 20%, adaptive targets or closed 0% beside open 100%.
9. Open **Physical Prototype Connection**. Without hardware, show the target preview; with the ESP32-S3, connect over USB, enable physical control, and move each panel.
10. Use **Run privacy demonstration** for the guided 12-scene sequence. Pause, seek, restart or exit. Exit restores the previous live state.

For the most reliable assignment demonstration, first use simulated occupants. Camera mode is an optional extra.

## What is included

| Area                  | Available behavior                                                                                                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Room Designer         | Room width, length and height; wall finish and color; floor finish; window size, sill and lateral position; panel-pair width and height; 2–4 modules                           |
| Room presets          | Original studio, Bedroom, Office, Classroom and Architecture Studio; these change enclosure proportions and finishes while retaining and fitting the original furniture layout |
| Saved room            | Explicit Save room / Restore saved in browser local storage, with unavailable/corrupt-storage handling                                                                         |
| Occupancy             | Animated entry/exit, individual selection, depth-zone movement and arbitrary clear destinations on the 2D plan                                                                 |
| Automatic control     | Occupant-to-observer intersections with the current window aperture, independent module targets, day/evening/night rules, privacy preference and a stability delay             |
| Manual control        | Global and per-module 0–100% commands; selecting Manual stops camera-driven control while leaving its preview available                                                        |
| Empty room            | Configurable default opening, initially 100%                                                                                                                                   |
| Safety demonstration  | Configurable override, initially 100%; exits frozen studies before taking control, blocks conflicting commands, and restores previous commands on exit                         |
| Performance dashboard | Source count, coordinates, selected module, mode, status, target/current openings, projected clear area, estimated exposure, servo previews and comparisons                    |
| Camera                | Explicit Start / Stop / Return to Simulation; approximate horizontal person detection and optional facade driving                                                              |
| Views                 | Perspective, Interior, Exterior, Observer, Top / plan, Section, Facade detail and Facade elevation                                                                             |
| Existing studies      | Form development, real perforations, sightline raycasts, surroundings, lighting override, quality controls, PNG capture and presentation mode                                  |
| Fallback              | An interactive 2D plan and working controls if WebGL 2 is unavailable                                                                                                          |
| Academic footer       | Project, both developers, subject and institute; visible outside the scrollable control panel                                                                                  |

### Room size and occupants

All spatial values use metres. Window and panel dimensions are constrained so they remain inside the wall and their module bays. Each module contains two rigid leaves; panel-pair width is the width of the closed pair, not one leaf. Reducing panel width or height leaves permanent unscreened gaps.

The original room supports 21 simulated people. Smaller rooms use `min(21, floor(width × length / 3))` as a conservative crowd-simulation limit: the Bedroom preset supports 10 and Office supports 16. **This is not a legal occupancy or building-code calculation.**

Resizing is a layout operation: occupants are fitted to separated, clear destinations. If the smaller room cannot retain everyone, excess simulated people are removed and a notice explains the new limit. Ordinary occupant movement remains animated. Furniture retains its original style and is scaled uniformly to fit; this is not a furniture-placement editor.

Saved room configurations contain geometry and finishes only. They do not store camera footage, detected people, live occupants or hardware calibration.

## How automatic privacy control works

1. Consider only indoor simulated occupants, or the explicitly selected camera input source.
2. In simulation mode, project a three-point shoulder-width cone between the outside observer and each person onto the facade. Check horizontal window bounds and approximate eye-height intersection with the aperture.
3. Identify the affected module or adjacent modules. The closest-depth request sets the most restrictive command for each affected module.
4. Apply the proposed response table, lighting override and privacy preference.
5. Wait until a candidate command stays stable for the configured delay. Then animate the rigid bi-fold mechanism toward that command.

| Lighting condition  | Rear | Center | Near window |
| ------------------- | ---: | -----: | ----------: |
| Day                 |  80% |    60% |         40% |
| Evening             |  60% |    45% |         30% |
| Night, interior lit |  40% |    25% |         10% |

These are the values at the default privacy preference of 50. Changing the preference shifts affected targets by up to 20 percentage points. At night with interior lights explicitly off, the controller uses the evening baseline. Unaffected modules remain at 100%; an empty input uses the configurable empty-room opening.

The fold angle is a geometric simulation angle between 0° and 86°. It is **not** a motor angle. The model uses two connected rigid leaves, an outward middle hinge and a free edge sliding along the same track. Real mesh perforations are retained at all panel sizes.

### Meaning of the metrics

- **Opening command:** the requested mechanism position, 0–100%.
- **Current opening:** the animated mechanism position as it approaches its target.
- **Projected clear opening:** the area outside the projected panel leaves, derived from panel dimensions and the cosine of the fold angle. It excludes perforation area and frame losses. Even at 100% command the folded leaves occupy some projected area.
- **Exposure index:** a teaching estimate based on affected zones, projected clear area, an assumed residual perforation contribution and an assumed lighting weight. It is not a probability of recognition or a validated privacy score. N/A means no applicable occupant sightline was found.
- **Privacy Analysis:** a separate geometric check tracing five rays to the selected simulated occupant, using actual holes and first-hit opaque obstructions. It does not quantify lighting contrast or identify faces.
- **Plan shading:** highlights zones requesting privacy. It is not a measured heatmap.

No measured lux, energy savings, ventilation performance, guaranteed privacy or validated safety performance is claimed. Glazing remains closed in this model.

## Live Camera Mode

1. Open the website using **localhost** or HTTPS in a browser that supports camera access.
2. Open **Live Camera Mode** and click **Start Camera**.
3. Grant camera permission if you want to use the feature. Wait for the model to load.
4. The unmirrored preview displays detected people and left / center / right image zones.
5. Enable **Drive facade from detections** to use horizontal image positions for module selection. The controller uses an assumed depth of 40% of the room length.
6. Click **Stop Camera** or **Return to Simulation** to stop all camera tracks and restore simulated input. Your simulated occupants remain available.

The camera stops when the tab is hidden, the component is unmounted, the device disconnects, or a demonstration/comparison begins. Permission, device, model-download and detection errors are handled without disabling simulation mode. Model loading has a 45-second timeout.

Inference uses TensorFlow.js 4.22.0 and COCO-SSD 2.2.3 (`lite_mobilenet_v2`). The code does not record, upload or persist frames. Model downloads are inbound network requests; model files are not included in this ZIP. There is no room scan, depth calibration or identification of individuals. Detection can miss people or flicker.

**Live camera capture and detection on a real webcam were not tested in the available environment.** Use the simulation for your main presentation and try the camera on your laptop beforehand.

## Future Arduino connection

The current hardware section always says **Simulation Only**. Connecting an Arduino cable will not automatically connect the website or move a motor. The disabled connection button is intentional.

`src/simulation/control.js` exports `hardwarePacket(commands, calibration)`, which separates opening percentages from proposed motor angles. The UI displays individual target angles, a JSON packet and a serial preview such as:

```text
M1:90,M2:45,M3:20,M4:90
```

A future transport will subscribe to accepted engine targets, apply measured calibration, request a Web Serial port after a user click, and send newline-terminated commands to validated firmware. It must handle acknowledgements, disconnects and command limits. See **ARDUINO_INTEGRATION.md** for the adapter boundary and example data.

## Presentation and shortcuts

The guided sequence covers introduction, privacy problem, room, modules, occupants, automatic response, day, night, manual override, analysis, future hardware and conclusion. It uses the existing scene and playback controls.

- Drag / scroll: orbit and zoom in perspective/detail views.
- Plan / section / elevation: orthographic views, with pan and zoom.
- Click a 3D module label or use the panel/dashboard: select the module.
- Click an indoor person: select the occupant.
- Click an outside pedestrian: use that position as the observer.
- Left / right arrows: previous / next demonstration scene.
- Space: pause / play demonstration.
- Escape: leave a temporary or presentation view.
- Camera icon: download a PNG of the rendered 3D view.

Keyboard shortcuts do not take over text fields, sliders or select menus.

## Academic details

Edit `src/project.js` if an attribution needs correction. Both developer names, subject and institute are filled in exactly as requested.

The supplied source files **and bundled builds contained no professor name**. The field is therefore blank in configuration, and the footer says “Not specified in supplied project.” Enter the correct name in `PROJECT.professor`; no name has been guessed.

## Build and verify

```bash
npm test
npm run build
npm run preview
```

The source package includes the generated `dist/` build. Keep `package-lock.json` for the tested dependency versions. The normal 3D scene and the optional detection libraries load in separate chunks so the camera libraries are not loaded during normal use.

**25 automated tests pass**, including the original regression cases and the new room/control cases. The production build completes without errors or bundle-size warnings. See **VERIFICATION.md** for what was actually checked and the remaining limits. See **CHANGES.md** for the file-by-file change summary.

The available browser did not expose WebGL 2. Controls, local saving, the fallback plan, footer, safety override, independent manual commands and presentation controls were inspected; GPU-rendered views, actual webcam inference and exact mobile device layouts still need a check on the presentation laptop/phone.

## Troubleshooting

- **No 3D view:** enable browser graphics/hardware acceleration and restart the browser. The 2D fallback keeps the simulation usable.
- **Slow laptop:** choose Display quality → Balanced, pause exterior motion, and keep the optional camera stopped.
- **Camera unavailable:** use localhost/HTTPS, check browser permission and close other apps using the webcam. Continue in simulation mode if the model download fails.
- **Saved room unavailable:** local storage may be blocked or cleared; select a room preset and save again.
- **Port busy:** open the alternative URL printed by Vite.
- **Incorrect npm folder:** open the directory containing `package.json`, not the outer ZIP folder.
- **Before presenting:** run the guided demo on your laptop, check the interior/exterior/elevation views, try manual M02, and verify the full footer.


## NEW: Connect the real four-motor ESP32-S3 prototype

**Hardware:** ESP32-S3 N16R8, PCA9685 at I²C address 0x40, four SG90 servos on channels 0–3. Keep the proven wiring: ESP32 3V3 → PCA VCC, ESP32 GND → PCA GND, GPIO8 → SDA, GPIO9 → SCL. Servo power is **separate** from logic power: a verified, regulated 5V supply of sufficient current connects to PCA V+ / GND. Do not use a raw 2-cell Li-ion holder directly for servo V+; it may exceed the SG90's rating. Do not power the servos from ESP32 3V3.

1. Disconnect the physical facade linkage for the first test; the firmware sends all four servos to 90° **at boot**.
2. In Arduino IDE, install **Adafruit PWM Servo Driver Library** and open `firmware/ESP32S3_Facade_WebSerial.ino`. Select **ESP32S3 Dev Module** and the board's working COM port, then upload.
3. You may test `HELLO` in Arduino Serial Monitor (115200 baud, **New Line**) and expect `FACADE_READY,4`. Test `1,90` and expect `OK`. Close Serial Monitor afterward.
4. In VS Code, open the project folder and run `npm install` then `npm run dev`. Open `http://localhost:5173` using **desktop Chrome or Edge**. Web Serial does not work in every browser or from an ordinary `file://` URL.
5. Click the **Prototype** shortcut at the top of the right control panel, then **Connect ESP32 (USB)**. Select the correct COM port in the browser chooser. The page verifies the `HELLO` handshake. Merely connecting **does not** move any motor.
6. Click **Enable physical control**. This still sends no movement. Use **Test one motor at a time**, or switch to **Manual** and move an individual module slider. Subsequent Auto or camera-driven target changes use the same serial connection while enabled.
7. Use **Stop sending motor commands** to disarm. This does **not** disconnect power or provide an emergency stop. Use the hardware power disconnect if needed.

The protocol is newline-terminated `motor,angle` (for example `1,120\n`) and `OK` replies, matching the earlier Arduino Serial Monitor tests. A `HELLO` handshake now verifies that the expected four-motor firmware is connected. The website maps 0–100% opening to a conservative 60–120° range, with an optional reverse checkbox for each motor. Check linkage clearance before increasing travel.

**Important:** The `dist/` directory, if present from an older project archive, is not the source of truth. Rebuild with `npm run build` after `npm install` before publishing. Hardware movement is not measured; an `OK` response confirms command acceptance, not actual position.

**This updated ZIP contains editable source, not a prebuilt production bundle.** Run `npm install` and `npm run dev` locally; run `npm run build` if you need a new `dist/` for hosting.
