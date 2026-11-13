import { useSyncExternalStore } from "react";
import { connectionStore, PHASE_LABEL } from "../../hardware/connectionStore.js";

// Reflects the real Web Serial state published by PrototypeConnection.
export default function ConnectionBadge({ onClick, compact = false }) {
  const c = useSyncExternalStore(connectionStore.subscribe, connectionStore.getSnapshot);
  const label = PHASE_LABEL[c.phase];
  return (
    <button
      type="button"
      className={"apf-conn-badge phase-" + c.phase + (compact ? " compact" : "")}
      onClick={onClick}
      title={c.status + (c.error ? " — " + c.error : "")}
      aria-label={"Prototype: " + label + ". Open prototype connection."}
    >
      <i aria-hidden="true" />
      <span>{compact ? label : "Prototype · " + label}</span>
    </button>
  );
}
