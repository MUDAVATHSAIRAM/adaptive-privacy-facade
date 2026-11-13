import FloorPlan from "./FloorPlan.jsx";
export default function PlanInset({ s }) {
  return (
    <div className="plan-inset">
      <span className="eyebrow">PLAN / PRIVACY ZONES</span>
      <FloorPlan s={s} />
      <span className="small-note">Shaded zones request privacy.</span>
    </div>
  );
}
