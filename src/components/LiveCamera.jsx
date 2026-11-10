import { useEffect, useRef, useState } from "react";
import { engine } from "../simulation/engine.js";
import { Toggle } from "./Widgets.jsx";
import {
  Video,
  VideoOff,
  ScanFace,
  Users,
  Bot,
  Lock,
  Loader2,
  ShieldCheck,
  Info,
} from "lucide-react";

const cameraError = (error) =>
  ({
    NotAllowedError:
      "Camera permission was denied. Allow access in your browser, then try again.",
    NotFoundError: "No camera was found. The simulation is still available.",
    NotReadableError:
      "The camera is busy or unavailable. Close other camera apps and try again.",
    SecurityError: "Camera access needs localhost or a secure HTTPS page.",
  })[error?.name] ||
  "Camera or detection could not start. Check your connection and camera, then retry. Simulation mode is still available.";

export default function LiveCamera({ s }) {
  const video = useRef(),
    session = useRef({
      token: 0,
      stream: null,
      model: null,
      timer: null,
      busy: false,
    });
  const [status, setStatus] = useState("off"),
    [message, setMessage] = useState("");
  const [detections, setDetections] = useState([]);
  const stop = (update = true) => {
    const a = session.current;
    a.token++;
    clearTimeout(a.timer);
    a.stream?.getTracks().forEach((track) => track.stop());
    a.stream = null;
    if (video.current) video.current.srcObject = null;
    if (!a.busy) {
      a.model?.dispose();
      a.model = null;
    }
    engine.setCameraInput({
      active: false,
      driving: false,
      detections: [],
      status: "off",
    });
    if (update) {
      setStatus("off");
      setDetections([]);
    }
  };
  useEffect(() => {
    engine.stopCamera = () => stop();
    const hide = () => {
      if (document.hidden) stop();
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      engine.stopCamera = null;
      stop(false);
    };
  }, []);
  const start = async () => {
    stop();
    setMessage("");
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setMessage(
        "Camera access is unavailable here. Open localhost or HTTPS in a camera-capable browser.",
      );
      return;
    }
    if (session.current.busy) {
      setMessage("The previous detection is finishing. Try again in a moment.");
      return;
    }
    const a = session.current,
      token = ++a.token;
    const valid = () => a.token === token;
    setStatus("permission");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
        audio: false,
      });
      if (!valid()) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      a.stream = stream;
      stream.getVideoTracks().forEach((track) =>
        track.addEventListener("ended", () => {
          if (valid()) {
            stop();
            setMessage(
              "Camera disconnected. Return to simulation or reconnect and start again.",
            );
          }
        }),
      );
      video.current.srcObject = stream;
      await video.current.play();
      if (!valid()) return;
      setStatus("loading");
      const loading = (async () => {
        const tf = await import("@tensorflow/tfjs");
        await tf.ready();
        const coco = await import("@tensorflow-models/coco-ssd");
        const model = await coco.load({ base: "lite_mobilenet_v2" });
        if (!valid()) {
          model.dispose();
          return null;
        }
        return model;
      })();
      let timeout, loadedModel;
      try {
        loadedModel = await Promise.race([
          loading,
          new Promise((_, reject) => {
            timeout = setTimeout(
              () => reject(new Error("Model download timed out")),
              45000,
            );
          }),
        ]);
      } finally {
        clearTimeout(timeout);
      }
      if (!valid() || !loadedModel) return;
      a.model = loadedModel;
      setStatus("running");
      engine.setCameraInput({ active: true, status: "running" });
      const detect = async () => {
        if (!valid() || !a.model || !video.current) return;
        if (video.current.readyState < 2) {
          a.timer = setTimeout(detect, 250);
          return;
        }
        a.busy = true;
        try {
          const predictions = await a.model.detect(video.current, 30, 0.55);
          if (!valid()) return;
          const width = video.current.videoWidth,
            height = video.current.videoHeight;
          const people = predictions
            .filter((p) => p.class === "person" && p.score >= 0.55)
            .slice(0, 21)
            .map((p) => {
              const [x, y, w, h] = p.bbox,
                u = Math.max(0, Math.min(1, (x + w / 2) / width));
              return {
                u,
                zone: u < 1 / 3 ? "left" : u < 2 / 3 ? "center" : "right",
                score: p.score,
                box: [x / width, y / height, w / width, h / height],
              };
            });
          setDetections(people);
          engine.setCameraInput({ detections: people });
          a.timer = setTimeout(detect, 350);
        } catch (error) {
          if (valid()) {
            stop();
            setStatus("error");
            setMessage(cameraError(error));
          }
        } finally {
          a.busy = false;
          if (!valid()) {
            a.model?.dispose();
            a.model = null;
          }
        }
      };
      detect();
    } catch (error) {
      if (valid()) {
        stop();
        setStatus("error");
        setMessage(cameraError(error));
      }
    }
  };
  const active = ["permission", "loading", "running"].includes(status);
  const zones = [...new Set(detections.map((p) => p.zone))];
  const blocked = s.compare || !!s.demo || s.safety.active;
  const detectionLabel =
    status === "running"
      ? detections.length
        ? "Person detected"
        : "Scanning · no person"
      : status === "loading"
        ? "Loading model"
        : status === "permission"
          ? "Awaiting permission"
          : status === "error"
            ? "Unavailable"
            : "Idle";
  return (
    <div className="live-camera apf-camera">
      <div className="apf-camera-grid">
        <div className="apf-camera-stage">
          <div className={"camera-preview apf-preview status-" + status}>
            <video
              ref={video}
              muted
              playsInline
              aria-label="Live camera preview, unmirrored"
            />
            {!active && (
              <div className="apf-preview-empty">
                <VideoOff size={34} aria-hidden="true" />
                <span>Camera is off</span>
                <small>Your video never leaves this browser.</small>
                <button
                  className="apf-btn apf-btn-primary"
                  disabled={blocked}
                  onClick={start}
                >
                  <Video size={18} /> Enable Camera
                </button>
              </div>
            )}
            {(status === "permission" || status === "loading") && (
              <div className="apf-preview-loading" role="status">
                <Loader2 size={22} className="apf-spin" />
                {status === "permission"
                  ? "Waiting for camera permission…"
                  : "Loading person-detection model…"}
              </div>
            )}
            {detections.map((p, i) => (
              <div
                key={i}
                className="detection-box"
                style={{
                  left: `${p.box[0] * 100}%`,
                  top: `${p.box[1] * 100}%`,
                  width: `${p.box[2] * 100}%`,
                  height: `${p.box[3] * 100}%`,
                }}
              >
                <span>
                  {p.zone} {Math.round(p.score * 100)}%
                </span>
              </div>
            ))}
            <div className="image-zones">
              <span className={zones.includes("left") ? "hot" : ""}>LEFT</span>
              <span className={zones.includes("center") ? "hot" : ""}>CENTER</span>
              <span className={zones.includes("right") ? "hot" : ""}>RIGHT</span>
            </div>
            {status === "running" && (
              <span className="apf-live-tag">
                <i /> LIVE
              </span>
            )}
          </div>
          <p className="camera-status" role="status">
            {status === "permission"
              ? "Waiting for camera permission…"
              : status === "loading"
                ? "Loading person-detection model…"
                : status === "running"
                  ? `${detections.length} visible people · ${zones.join(", ") || "no active zone"}`
                  : message || "Start Camera to request permission."}
          </p>
        </div>

        <div className="apf-camera-side">
          <div className="apf-stat-grid">
            <div className={"apf-stat " + (active ? "on" : "")}>
              {active ? <Video size={17} /> : <VideoOff size={17} />}
              <span>Camera</span>
              <strong>{active ? "On" : "Off"}</strong>
            </div>
            <div className={"apf-stat " + (status === "running" ? "on" : "")}>
              <ScanFace size={17} />
              <span>Detection</span>
              <strong>{detectionLabel}</strong>
            </div>
            <div className={"apf-stat " + (detections.length ? "on" : "")}>
              <Users size={17} />
              <span>People</span>
              <strong>
                {status === "running" ? detections.length : "—"}
              </strong>
            </div>
            <div
              className={
                "apf-stat " + (s.cameraInput.driving ? "on accent" : "")
              }
            >
              <Bot size={17} />
              <span>Facade mode</span>
              <strong>
                {s.safety.active
                  ? "Safety demo"
                  : s.cameraInput.driving
                    ? "Auto · camera"
                    : s.mode === "auto"
                      ? "Auto · simulation"
                      : "Manual"}
              </strong>
            </div>
          </div>

          <div className="two-buttons apf-cam-buttons">
            <button
              className="apf-btn apf-btn-primary"
              disabled={active || blocked}
              onClick={start}
            >
              <Video size={17} /> Start Camera
            </button>
            <button
              className="apf-btn apf-btn-ghost"
              disabled={!active}
              onClick={() => stop()}
            >
              <VideoOff size={17} /> Stop Camera
            </button>
          </div>
          {blocked && (
            <p className="small-note apf-hint">
              <Info size={14} className="apf-inline-icon" />
              Exit the comparison, demonstration or safety override to start the camera.
            </p>
          )}

          <div className="apf-drive">
            <Toggle
              label="Drive facade from detections"
              disabled={status !== "running" || s.safety.active}
              checked={s.cameraInput.driving}
              onChange={(driving) => {
                if (status === "running" && !s.safety.active)
                  engine.setCameraInput({ driving });
              }}
            />
            <p className="small-note">
              Switches the facade to Automatic and lets detected image zones set
              the panel targets. If physical control is enabled, the same motor
              link moves the prototype.
            </p>
          </div>

          <div className="apf-permission">
            <Lock size={15} />
            <p>
              Your browser will ask for camera permission. Choose <b>Allow</b>.
              If you blocked it earlier, use the camera icon in the address bar.
              Camera access needs localhost or HTTPS.
            </p>
          </div>

          <button
            className="text-action"
            onClick={() => {
              stop();
              setMessage(
                "Simulation restored. Your simulated occupants were retained.",
              );
            }}
          >
            Return to Simulation
          </button>
        </div>
      </div>

      <details className="apf-card apf-advanced apf-camera-notes">
        <summary>
          <span>
            <ShieldCheck size={15} className="apf-inline-icon" />
            How detection works & privacy
          </span>
        </summary>
        <div className="apf-advanced-body">
          <p className="small-note">
            Approximate image-based zoning. Frames stay in this browser; they are
            not recorded or uploaded. Starting downloads the detection model over
            the internet.
          </p>
          <p className="small-note">
            Preview is unmirrored. Horizontal image position maps to facade modules;
            depth is assumed at 40% of room length. A webcam does not measure room
            dimensions or calibrated 3D positions. Tracking may miss people or
            flicker.
          </p>
          <p className="small-note">
            Detection:{" "}
            <a
              href="https://github.com/tensorflow/tfjs-models/tree/master/coco-ssd"
              target="_blank"
              rel="noreferrer"
            >
              TensorFlow.js COCO-SSD
            </a>
            . If unavailable, all simulated controls continue working.
          </p>
        </div>
      </details>
    </div>
  );
}
