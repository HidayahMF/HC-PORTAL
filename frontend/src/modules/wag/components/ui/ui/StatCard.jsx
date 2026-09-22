import Icon from "./Icon";

const TONES = {
  brand: { text: "text-brand", icon: "bg-brand-soft text-brand", ring: "ring-brand/30" },
  success: { text: "text-success", icon: "bg-success-soft text-success", ring: "ring-success/30" },
  warning: { text: "text-warning", icon: "bg-warning-soft text-warning", ring: "ring-warning/30" },
  danger: { text: "text-danger", icon: "bg-danger-soft text-danger", ring: "ring-danger/30" },
  info: { text: "text-info", icon: "bg-info-soft text-info", ring: "ring-info/30" },
  neutral: { text: "text-txt-secondary", icon: "bg-surface-muted text-txt-secondary", ring: "ring-slate-300/40" },
};

export default function StatCard({ label, value, icon, tone = "neutral", active = false, onClick, hint }) {
  const t = TONES[tone];
  const Comp = onClick ? "button" : "div";

  return (
    <Comp
      onClick={onClick}
      className={`rounded-2xl border bg-surface-card p-4 text-left transition-all duration-150 ${
        onClick ? "cursor-pointer hover:shadow-card-hover" : ""
      } ${active ? `border-transparent ring-2 ${t.ring}` : "border-surface-border"}`}
    >
      <div className="flex items-center gap-3">
        {icon && (
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${t.icon}`}>
            <Icon name={icon} size={18} />
          </span>
        )}
        <div className="min-w-0">
          <div className={`text-2xl font-bold leading-tight ${t.text}`}>{value}</div>
          <div className="mt-0.5 truncate text-xs font-medium text-txt-muted">{label}</div>
        </div>
      </div>
      {hint && <div className="mt-2 text-[11px] text-txt-muted">{hint}</div>}
    </Comp>
  );
}
