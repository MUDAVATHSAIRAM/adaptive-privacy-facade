import { Play, Pause, SkipBack, SkipForward, RotateCcw, X } from "lucide-react";
import { engine } from "../simulation/engine.js";
import { STORY } from "../simulation/story.js";

export default function StoryPlayer({ s }) {
  if (!s.demo) return null;
  const d = s.demo,
    story = STORY[d.index];
  return (
    <div className="story-player" aria-label="Demonstration playback">
      <div className="story-top">
        <span className="eyebrow">PRIVACY DEMONSTRATION</span>
        <button
          className="icon-button"
          aria-label="Exit demo"
          onClick={() => engine.exitDemo()}
        >
          <X size={16} />
        </button>
      </div>
      <div className="story-content">
        <span className="story-number">
          {String(d.index + 1).padStart(2, "0")}
        </span>
        <div>
          <h2>{story.title}</h2>
          <p>{story.caption}</p>
        </div>
      </div>
      {story.hardware && (
        <code className="story-command">
          Simulation Only · {s.hardware.serialPreview}
        </code>
      )}
      <div className="story-bottom">
        <div className="story-actions">
          <button
            className="icon-button"
            aria-label="Previous demo scene"
            disabled={d.index === 0}
            onClick={() => engine.stepDemo(-1)}
          >
            <SkipBack size={17} />
          </button>
          <button
            className="play-button"
            aria-label={d.paused ? "Play demo" : "Pause demo"}
            onClick={() => engine.pauseDemo()}
          >
            {d.paused ? <Play size={17} /> : <Pause size={17} />}
          </button>
          <button
            className="icon-button"
            aria-label="Next demo scene"
            disabled={d.index === STORY.length - 1}
            onClick={() => engine.stepDemo(1)}
          >
            <SkipForward size={17} />
          </button>
          <button
            className="icon-button"
            aria-label="Restart demo"
            onClick={() => {
              engine.state.demo.paused = false;
              engine.applyStory(0, true);
            }}
          >
            <RotateCcw size={16} />
          </button>
        </div>
        <div className="story-progress">
          {STORY.map((scene, i) => (
            <button
              key={i}
              aria-label={"Go to scene " + (i + 1) + ": " + scene.title}
              onClick={() => engine.applyStory(i, true)}
              className={
                i < d.index ? "complete" : i === d.index ? "current" : ""
              }
            >
              <i
                style={{
                  width:
                    i < d.index
                      ? "100%"
                      : i === d.index
                        ? Math.min(100, (d.time / story.duration) * 100) + "%"
                        : "0%",
                }}
              />
            </button>
          ))}
        </div>
        <span className="story-index">
          {d.index + 1} / {STORY.length}
        </span>
      </div>
    </div>
  );
}
