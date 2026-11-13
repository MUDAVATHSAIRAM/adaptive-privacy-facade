import { ChevronDown } from "lucide-react";
export function Toggle({ label, checked, onChange, disabled = false }) {
  return (
    <label className="toggle-row">
      <span>{label}</span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="switch" aria-hidden="true" />
    </label>
  );
}
export function Range({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  disabled = false,
  suffix = "%",
  id,
  step = 1,
}) {
  return (
    <label
      className={"range-control " + (disabled ? "disabled" : "")}
      htmlFor={id}
    >
      <span className="range-label">
        <span>{label}</span>
        <output>
          {Number(value)
            .toFixed(step < 1 ? 2 : 0)
            .replace(/\.0+$/, "")}
          {suffix}
        </output>
      </span>
      <input
        id={id}
        aria-label={label}
        type="range"
        min={min}
        max={max}
        step={step}
        value={Number(value)
          .toFixed(step < 1 ? 2 : 0)
          .replace(/\.0+$/, "")}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ "--range": ((value - min) / (max - min)) * 100 + "%" }}
      />
    </label>
  );
}
export function Section({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
  badge,
}) {
  return (
    <details
      id={title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}
      className="tool-section"
      open={defaultOpen || undefined}
    >
      <summary>
        <Icon size={16} />
        <span>{title}</span>
        {badge && <small>{badge}</small>}
        <ChevronDown size={15} className="chevron" />
      </summary>
      <div className="section-body">{children}</div>
    </details>
  );
}
