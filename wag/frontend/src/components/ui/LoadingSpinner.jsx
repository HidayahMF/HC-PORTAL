import Icon from "./Icon";

export default function LoadingSpinner({ size = 20, label = "Memuat..." }) {
  return (
    <span role="status" className="inline-flex items-center gap-2 text-txt-muted">
      <Icon name="refresh" size={size} className="animate-spin" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
