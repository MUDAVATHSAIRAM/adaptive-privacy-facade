# Verification — 2 November 2026

## Completed checks

- Dependencies installed successfully with the pinned lockfile.
- `npm test`: **25 tests passed, 0 failed**.
- `npm run build`: production build completed successfully with no build errors or bundle-size warnings.
- The 3D scene and optional TensorFlow detector are separate lazy-loaded chunks.

## Automated coverage

The original eight cases still cover animated entry/departure through every original-room count from 0 to 21, rapid target changes, movement between depth zones at full capacity, independent manual commands, observer-sensitive auto logic, frozen comparisons, demo restoration, connected rigid hinges and ray intersections with real perforations.

Seventeen additional cases cover:

- Window/panel constraints across 160 varied room configurations.
- Every room preset reaching its simulation crowd limit with separate destinations outside furniture.
- Resizing an occupied room, fitting occupants and maintaining module-array lengths.
- Shifted window openings, module count changes and high-sill sightline exclusion.
- Stability-delay suppression of alternating input zones.
- Day/night rules, interior lights-off handling and privacy preference.
- Configurable empty-room targets and safety target/restoration.
- Safety override leaving paused demonstrations/comparisons.
- Manual override of camera driving without losing simulated occupants.
- Independent percentage/angle mapping and reversed calibration.
- Saved-room round trip and corrupt/unsupported save rejection.
- Rejection of blocked destinations and arrival at a clear clicked destination.
- Rigid hinges at different panel sizes and actual generated mesh dimensions.
- Bounded exposure/area estimates and consistent comparison direction.
- Scenario presets selected while a demonstration is active.
- Paused demonstration seeks matching light and opening keyframes.
- Camera input stopping for a frozen comparison and prevention of freezing a safety override.

## Browser checks performed

The interface was inspected at a 1363 × 936 desktop viewport:

- The complete academic footer was visible below the workspace.
- Original studio → Bedroom changed dimensions, finishes and active module count.
- Save room → change preset → Restore saved recovered the saved configuration.
- Dashboard displayed N/A exposure for no applicable occupants and updated clear-area estimates.
- Manual Closed followed by Module 02 at 100% produced independent commands `0 / 100 / 0 / 0` and serial preview `M1:0,M2:90,M3:0,M4:0`.
- Safety override showed its conceptual warning, changed all targets and disabled conflicting manual controls.
- Demonstration pause/seek showed the digital control-network scene with command preview and the requested 12-scene sequence.
- The comparison selector changed the visible alternative to Closed / 0%.
- The WebGL-unavailable state retained a live 2D floor plan and controls.

## Limits — do not treat these as completed tests

1. **WebGL 2 was unavailable in the test browser.** GPU-rendered camera views, shadows, visual material quality, 3D clicking, ray-overlay appearance, PNG capture and real rendering frame rate could not be inspected. Geometry and ray logic were tested programmatically.
2. **No real webcam inference was tested.** The camera UI, input-to-command logic, start/stop/error code paths and lazy build integration are present. Actual camera permissions, model download, detection quality and live lifecycle behavior need a test on the user's laptop. Network restrictions can prevent the optional model download.
3. **Exact phone/tablet sizes were not visually tested.** Responsive CSS and wrapping are supplied, but touch interaction and the complete footer should be checked on the target phone.
4. **No physical microcontroller was connected or tested.** Serial transport and firmware are deliberately unimplemented; all motor angles are uncalibrated previews.
5. **No measured building performance was validated.** Crowd limits, privacy rules, exposure indices, safety override and clear-area formulas are teaching assumptions.
6. Room-type presets retain the supplied furniture style and change enclosure/finish parameters. This release has no arbitrary furniture editor.
7. No professor name existed in the supplied source or bundles. The footer explicitly marks this missing value; set `PROJECT.professor` in `src/project.js` before submission.

## Check on the presentation laptop

Run `npm install` and `npm run dev`. Check Perspective, Interior, Exterior, Top and Elevation; add and move occupants; try Night, manual M02, Privacy Analysis, each comparison option and Capture View. Run the demonstration once, then exit it to verify restoration. Confirm the full footer. Use Balanced quality on a slower laptop. Try the optional camera separately, with no need to connect an Arduino.
