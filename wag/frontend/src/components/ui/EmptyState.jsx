import Icon from "./Icon";

export default function EmptyState({ icon = "info", title = "Belum ada data", description, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-muted text-txt-placeholder">
        <Icon name={icon} size={26} />
      </div>
      <h3 className="text-[15px] font-semibold text-txt">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-txt-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
