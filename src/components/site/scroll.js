export function scrollToSection(id, reducedMotion = false) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce =
    reducedMotion ||
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  if (history.replaceState) history.replaceState(null, "", "#" + id);
}

export const NAV_ITEMS = [
  ["home", "Home"],
  ["live-control", "Live Control"],
  ["camera-detection", "Camera Detection"],
  ["how-it-works", "How It Works"],
  ["prototype-connection", "Prototype Connection"],
];
