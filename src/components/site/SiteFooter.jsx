import { PROJECT } from "../../project.js";
import { BrandMark } from "./SiteHeader.jsx";
import { NAV_ITEMS, scrollToSection } from "./scroll.js";

export default function SiteFooter({ s }) {
  return (
    <footer className="apf-footer">
      <div className="apf-container apf-footer-grid">
        <div className="apf-footer-brand">
          <span className="apf-brand-mark"><BrandMark /></span>
          <div>
            <strong>Adaptive Privacy Facade</strong>
            <p>
              {PROJECT.title}: dynamic visual privacy through kinetic perforated
              geometry, controlled from the browser and an ESP32-S3 prototype.
            </p>
          </div>
        </div>
        <div>
          <span className="apf-kicker">Academic project</span>
          <ul>
            <li>{PROJECT.department}</li>
            <li>{PROJECT.institute}</li>
            <li>Course: {PROJECT.subject}</li>
            <li>Developed by {PROJECT.developers}</li>
            {PROJECT.professor && <li>Faculty guide: {PROJECT.professor}</li>}
          </ul>
        </div>
        <div>
          <span className="apf-kicker">Explore</span>
          <ul>
            {NAV_ITEMS.map(([id, label]) => (
              <li key={id}>
                <a href={"#" + id} onClick={(e) => { e.preventDefault(); scrollToSection(id, s.reducedMotion); }}>{label}</a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <span className="apf-kicker">Credits</span>
          <ul>
            <li>
              Person detection:{" "}
              <a href="https://github.com/tensorflow/tfjs-models/tree/master/coco-ssd" target="_blank" rel="noreferrer">
                TensorFlow.js COCO-SSD
              </a>
            </li>
            <li>3D: three.js · React Three Fiber</li>
            <li>See ASSET_CREDITS.md and THIRD_PARTY_NOTICES.txt</li>
          </ul>
        </div>
      </div>
      <div className="apf-container apf-footer-base">
        <span>© {new Date().getFullYear()} {PROJECT.developers} · {PROJECT.institute}</span>
        <span>Conceptual architectural simulation · Calculated metrics are simulation estimates</span>
      </div>
    </footer>
  );
}
