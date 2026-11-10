import { Usb, ToggleLeft, MousePointerClick, Sparkles } from "lucide-react";
import Reveal from "./Reveal.jsx";

const STEPS = [
  [Usb, "Connect", "Connect the ESP32-S3 prototype through USB."],
  [ToggleLeft, "Select Mode", "Choose manual panel control or camera-based detection."],
  [MousePointerClick, "Interact", "Adjust panel angles or activate camera detection."],
  [Sparkles, "Experience", "Watch the facade respond on screen and on the physical prototype."],
];

export default function HowItWorks() {
  return (
    <ol className="apf-how">
      {STEPS.map(([Icon, title, text], i) => (
        <Reveal as="li" key={title} delay={i * 0.08} className="apf-how-step">
          <span className="apf-how-icon"><Icon size={22} /></span>
          <span className="apf-how-num">Step {i + 1}</span>
          <h3>{title}</h3>
          <p>{text}</p>
        </Reveal>
      ))}
    </ol>
  );
}
