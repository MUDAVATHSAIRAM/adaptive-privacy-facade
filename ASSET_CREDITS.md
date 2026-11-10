# Assets and software

The room, facade, perforations, furniture, figures, trees, vehicles, ground, neighboring forms, favicon, and plan diagram are generated from local code. There are no downloaded photos, HDR environments, 3D models, or web fonts.

Third-party software:

- React / React DOM — UI.
- Vite / React plugin — development and production build.
- Three.js — geometry, materials, lights, intersections, rendering.
- React Three Fiber — React integration for Three.js.
- Drei — camera controls, labels, and lines.
- Framer Motion — interface transitions.
- Lucide React — interface icons.

See **THIRD_PARTY_NOTICES.txt** for package license notices captured from the installed dependency tree.

Primary documentation:

- [React](https://react.dev/)
- [Vite](https://vite.dev/)
- [Three.js](https://threejs.org/docs/)
- [React Three Fiber](https://r3f.docs.pmnd.rs/getting-started/introduction)
- [Drei](https://drei.docs.pmnd.rs/)
- [Motion](https://motion.dev/)
- [Lucide](https://lucide.dev/)

Upgrade additions:

- TensorFlow.js 4.22.0 — optional local browser inference; Apache-2.0.
- TensorFlow Models COCO-SSD 2.2.3 — optional person detection; Apache-2.0. The model is downloaded only after Start Camera and is not bundled in the ZIP.
- [COCO-SSD official documentation](https://github.com/tensorflow/tfjs-models/tree/master/coco-ssd)

The application adds no photographic assets and does not record or upload webcam frames. Room presets reuse the original procedural furniture.
