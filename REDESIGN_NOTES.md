# UI/UX Redesign — Adaptive Privacy Facade

This release redesigns the **frontend only**. The page background (paper `#f4f2ed`), the 3D studio scene, the simulation engine, the camera detection algorithm, the Web Serial protocol and the ESP32-S3 firmware are unchanged.

## Run it in VS Code

1. Install **Node.js 22.13 or newer** (`node -v` to check).
2. Unzip, then in VS Code choose **File → Open Folder…** and open `adaptive-privacy-facade`.
3. Open the terminal (**Terminal → New Terminal**) and run:
   ```bash
   npm install
   npm run dev
   ```
4. Open the `http://localhost:5173` address it prints, in **desktop Chrome or Edge** (needed for USB).
5. Optional checks: `npm test` (27 tests) and `npm run build` (output in `dist/`).

## Deploy to Vercel

1. Push the `adaptive-privacy-facade` folder to a GitHub repository (the included `.gitignore` already skips `node_modules` and `dist`).
2. On vercel.com choose **Add New → Project**, import the repository.
3. Vercel detects **Vite**. Keep: Build Command `npm run build`, Output Directory `dist`, Install Command `npm install`. If the repo contains the folder as a subdirectory, set **Root Directory** to `adaptive-privacy-facade`.
4. Deploy. Vercel serves over HTTPS, so Web Serial (desktop Chrome/Edge) and the camera both work on the deployed URL.
   CLI alternative: `npm i -g vercel`, then `vercel` and `vercel --prod` inside the folder.

## Connect the physical prototype (USB)

1. Upload `firmware/ESP32S3_Facade_WebSerial.ino` with Arduino IDE (Adafruit PWM Servo Driver library). **Close the Serial Monitor afterwards.**
2. Power the servos from a verified regulated 5 V supply. Detach linkages for the first test.
3. Plug the ESP32-S3 into the computer with a USB **data** cable.
4. Open the site (localhost or HTTPS) in desktop Chrome or Edge.
5. Click **Connect Prototype** (welcome card, hero or header badge) or **Connect via USB** in *Prototype Connection*, then pick the ESP32's serial port.
6. The header badge turns **Connected** once the board answers `FACADE_READY,4`. Connecting does not move motors.
7. Click **Enable physical control**, then try *Calibration, motor test & setup details → Motor 1 → 45° panel*.
8. Choose **Manual Control** and move the panel sliders, or use **Camera Detection → Drive facade from detections**. Changes are sent as `<motor>,<servo angle>`.

## Modified files

| File | Change |
|---|---|
| `src/App.jsx` | New page structure: sticky header, hero, Live Control, Camera Detection, How It Works, Prototype Connection, footer, welcome card. The 3D stage markup inside it is unchanged. |
| `src/components/PrototypeConnection.jsx` | New layout (status, device info, big Connect via USB, 3-step guide, compatibility message, collapsible calibration/test panel). Connect/enable/send/disconnect logic unchanged; it now also publishes its real state for the header badge. |
| `src/components/LiveCamera.jsx` | New layout (large preview, Enable Camera, status tiles, permission help). Camera, model loading and detection code unchanged. |
| `src/components/Controls.jsx` | Camera and Prototype panels moved out of the side panel into their own page sections; the side panel links to them. All other controls unchanged. |
| `src/main.jsx` | Imports `redesign.css` after `styles.css`. |
| `src/project.js` | Added `department`. |
| `index.html` | Page title only. |

## New files

- `src/redesign.css` — the visual layer (glass cards, typography, sliders, responsive rules, reduced-motion rules).
- `src/hardware/connectionStore.js` — a UI-only mirror of the real connection state. It never talks to the ESP32.
- `src/components/site/` — `SiteHeader`, `ConnectionBadge`, `WelcomeCard`, `Hero`, `PanelDashboard`, `HowItWorks`, `SiteFooter`, `Reveal`, `scroll.js`.

## Unchanged (verified with a file diff)

`firmware/ESP32S3_Facade_WebSerial.ino`, `src/hardware/serial.js` (protocol, 115200 baud, `HELLO` handshake, 0–180 servo range, `openingToAngle`), `src/simulation/*` (engine, auto control, camera-to-command logic), `src/scene/*` (3D model), `src/styles.css`, `src/webmcp.js`, tests, package.json and lockfile. No new dependencies.

## Preserved vs. visually redesigned

- **Preserved behaviour:** four independent panels; website 0–100 % → servo 0–180 → panel ≈ 0–90°; serial commands and the 250 ms coalescing; connect/enable/stop/disconnect; per-motor reverse and single-motor tests; Auto/Manual modes and their existing locks (comparison, safety override); camera start/stop, COCO-SSD detection, zone mapping and "Drive facade from detections"; demonstration, comparison, analysis, room designer, presentation mode, keyboard shortcuts.
- **Visually redesigned:** header and navigation (with hamburger menu), welcome card, hero, Manual/Automatic segmented control, panel cards with degree readouts, Control All Panels, camera section, prototype section, How It Works, footer.
- **New UI elements that use existing functions only:** the panel cards call the same `engine.setOpening(value, index)` as the existing module sliders; Control All Panels and its presets call the same `engine.setOpening(value)` as the existing Facade opening slider; the mode switch calls `engine.setMode()`.
- **One behaviour difference:** the camera and prototype panels now stay mounted while Presentation mode is on. Before, entering Presentation mode unmounted them, which stopped the camera and disconnected the ESP32.

## Known gaps (not implemented, not fabricated)

- `PROJECT.professor` in `src/project.js` is empty, so the footer omits the faculty line. Add the name there.
- Degree values are approximate panel targets (servo command ÷ 2). Real panel travel is not measured.
- Person detection downloads the COCO-SSD model from the internet the first time **Start Camera** is pressed.
- The older `VERIFICATION.md` (2 November 2026) says serial transport is unimplemented. That's out of date: serial is implemented in `serial.js` and the firmware.

## Verification for this release

Done in a browser (headless Chromium, software WebGL):
- `npm test`: 27 passed, 0 failed. `npm run build`: succeeds.
- No horizontal overflow at 1440, 820 and 390 px widths. Layouts checked by screenshot.
- The welcome card shows on first load, **Explore Website** dismisses it, and it stays hidden for the rest of the session. No USB request happens until a button is clicked.
- With a **mocked** Web Serial port: Connect Prototype → `requestPort` → `HELLO` → `FACADE_READY,4` → header shows Connected; Enable physical control; Panel 02 at 50 % sent `2,90`; Closed sent `1,0 … 4,0`; Disconnect returned the badge to Not Connected.
- Manual/Automatic switch, Presentation mode and Esc exit work. No console errors.

**Not** done:
- No real ESP32-S3, PCA9685 or servos were connected. Physical movement is untested.
- No real webcam inference ran. The model didn't finish loading in the test sandbox, and the software-only WebGL froze the page during loading. Test camera detection on your own laptop.
- Real phones/tablets and touch dragging were not tested on hardware.

## Clear Liquid Glass theme (iOS-style), 12 November 2026

This replaces the earlier white-and-bronze "Light Liquid Glass" theme. The user asked for a complete UI change and allowed the background to change.

| File | Change |
|---|---|
| `src/ios-glass.css` | **New.** The whole theme: tokens, wallpaper, clear glass surfaces, buttons, header, viewport overlays, sidebar, sliders, switches, dashboard, camera, prototype, how-it-works, welcome/help, footer, presentation mode, spring motion, responsive rules, and fallbacks for no-blur, reduced-transparency, forced-colors and reduced-motion. |
| `src/main.jsx` | Imports `./ios-glass.css` last, in place of `./liquid-glass.css`. |
| `src/liquid-glass.css` | **Removed.** |
| `src/components/site/Reveal.jsx` | Scroll reveals use spring physics (fade, rise and slight scale). |
| `src/components/site/Hero.jsx` | Spring entrances, plus a pointer-following 3D tilt on the live-state card. The tilt is mouse only and turns off when reduced motion is on. |
| `src/scene/Scene.jsx` | Only the **daytime sky/fog colour** changes, from #e6e8e0 to #dfe9f5. Evening and night colours, lights, materials, geometry and cameras are unchanged. |

Also changed: the page background is now a soft blue, lavender, pink and mint mesh (`.app.apf-site::before`) with a faint architectural grid. It is static, which keeps it cheap next to WebGL.

Unchanged: firmware, `serial.js`, simulation, detection, connection logic and every event handler.

To revert: point the import in `main.jsx` back to the old theme, and set the sky colours in `Scene.jsx` back to #e6e8e0.
