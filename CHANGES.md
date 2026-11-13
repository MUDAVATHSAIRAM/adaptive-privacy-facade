# Upgrade changes — 2 November 2026

The existing project was modified in place. Its original procedural room, furniture, surroundings, instanced figures, rigid bi-fold mechanism, real perforations, camera system, comparison renderer, ray analysis and demonstration controls remain the foundation.

| File                                                     | Change                                                                                                                              |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `src/App.jsx`                                            | Lazy-loaded scene, loading state, dynamic room/capacity labels, configurable comparison, safety banner and complete academic footer |
| `src/project.js`                                         | Central project attribution; professor left unset because no name was present in the supplied source or builds                      |
| `src/components/Controls.jsx`                            | Existing controls retained; workspace shortcuts, dynamic module/crowd counts, control settings, safety override and new sections    |
| `src/components/Widgets.jsx`                             | Shared accessible toggle, range and collapsible-section components extracted from Controls                                          |
| `src/components/RoomDesigner.jsx`                        | Dimension/finish controls, 2–4 modules, room presets and local save/restore                                                         |
| `src/components/FloorPlan.jsx`                           | Shared plan, furniture footprints, privacy-zone shading, selectable occupants and destination input                                 |
| `src/components/PlanInset.jsx`                           | Reuses the live geometry-aware floor plan                                                                                           |
| `src/components/Dashboard.jsx`                           | Simulation metrics, per-module explanations, clear-area comparison and occupant coordinates                                         |
| `src/components/PrototypeConnection.jsx`                 | Simulation Only status, calibration preview, target angles, serial preview and JSON data                                            |
| `src/components/LiveCamera.jsx`                          | Explicit camera lifecycle, lazy person detector, error handling, image zoning and optional automatic-control input                  |
| `src/components/StoryPlayer.jsx`                         | Existing playback controls retained; future hardware commands displayed in the network scene                                        |
| `src/simulation/engine.js`                               | Geometry-aware state/navigation, crowd fitting, stability delay, overrides, input-source switching, metrics and room persistence    |
| `src/simulation/roomConfig.js`                           | Normalized room geometry, presets, facade layout, storage format and simulation crowd limit                                         |
| `src/simulation/control.js`                              | Shared automatic logic, affected-zone calculation, explanations, metric formulas and hardware mapping                               |
| `src/simulation/kinematics.js`                           | Pure fold-angle/hinge math shared by plan and 3D model, avoiding a Three.js import for the 2D plan                                  |
| `src/simulation/navigation.js`                           | Room-aware furniture bounds, clear destinations and pathfinding grid                                                                |
| `src/simulation/story.js`                                | Revised 12-stage academic presentation, preserving animated arrivals, night transition, manual M02 and analysis studies             |
| `src/scene/Room.jsx`                                     | Parametric enclosure, glazing/door coordination, dimension labels, finishes and uniformly fitted original furniture                 |
| `src/scene/Facade.jsx`                                   | Dynamic module bays, dimension-specific rigid leaves, clickable M01–M04 labels and selection                                        |
| `src/scene/perforation.js`                               | Real perforated geometry at custom leaf dimensions; shared hinge calculations preserved                                             |
| `src/scene/Cameras.jsx`                                  | Room-aware framing and facade elevation view                                                                                        |
| `src/scene/People.jsx`                                   | Entrance-ramp position follows current room dimensions; original instanced figures and walking animation retained                   |
| `src/scene/Analysis.jsx`                                 | Existing ray samples retained; highlighted requested zones and room-aware perforation labels                                        |
| `src/scene/Scene.jsx`                                    | Room-aware lights, adaptive/closed comparison alternatives, updated captures and interactive 2D fallback                            |
| `src/styles.css`                                         | Readable new panels, dashboard, camera preview, footer wrapping, loading state and responsive rules                                 |
| `src/webmcp.js`                                          | Existing optional tools retained; readout extended with room, capacity, safety, metrics and hardware preview                        |
| `tests/simulation.test.js`                               | Original regression cases retained; comparison-scene index adjusted for the requested presentation sequence                         |
| `tests/upgrade.test.js`                                  | 17 additional geometry, resizing, control, hardware, persistence and presentation regression cases                                  |
| `package.json`, `package-lock.json`                      | Added pinned TensorFlow.js and COCO-SSD dependencies for the optional lazy-loaded detector                                          |
| `README.md`, `VERIFICATION.md`, `ARDUINO_INTEGRATION.md` | Run instructions, demonstration guidance, actual check results, limitations and future adapter design                               |
| `ASSET_CREDITS.md`, `THIRD_PARTY_NOTICES.txt`            | Detection-library attribution and installed dependency license notices                                                              |
| `dist/`                                                  | Regenerated production build; obsolete bundled builds removed by Vite                                                               |

Original scene primitives, materials, surroundings and first-hit visibility implementation are retained. No backend or hardware dependency was introduced. The supplied source did not contain an academic attribution footer or professor name; the requested project/developer/course/institute details were added from the brief without inventing a professor name.
