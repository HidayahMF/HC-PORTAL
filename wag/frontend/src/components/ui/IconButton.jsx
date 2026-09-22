import Icon from "./Icon";

export default function IconButton({ icon, label, size = "md", variant = "ghost", className = "", ...rest }) {
  const dims = {
    sm: "h-8 w-8 [&>svg]:h-4 [&>svg]:w-4",
    md: "h-9 w-9 [&>svg]:h-[18px] [&>svg]:w-[18px]",
  }[size];
  const variants = {
    ghost: "text-txt-muted hover:bg-surface-muted hover:text-txt",
    solid: "bg-brand text-white hover:bg-brand-hover",
    danger: "text-danger hover:bg-danger-soft",
    outline: "border border-surface-border text-txt-secondary hover:bg-surface-muted",
  }[variant];

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center rounded-lg transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${dims} ${variants} ${className}`}
      {...rest}
    >
      <Icon name={icon} />
    </button>
  );
}
