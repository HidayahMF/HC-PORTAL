import Icon from "./Icon";

const VARIANTS = {
  primary: "bg-brand text-white hover:bg-brand-hover shadow-sm",
  secondary: "bg-white text-txt-secondary border border-surface-border hover:bg-surface-muted hover:text-txt",
  ghost: "bg-transparent text-txt-secondary hover:bg-surface-muted hover:text-txt",
  danger: "bg-danger text-white hover:bg-red-800 shadow-sm",
  "danger-outline": "bg-white text-danger border border-red-300 hover:bg-danger-soft",
  "brand-outline": "bg-white text-brand border border-brand/40 hover:bg-brand-soft",
};

const SIZES = {
  sm: "h-8 px-3 text-[13px] gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-11 px-5 text-[15px] gap-2",
};

export default function Button({
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  loading = false,
  fullWidth = false,
  className = "",
  disabled,
  children,
  ...rest
}) {
  const isDisabled = disabled || loading;
  return (
    <button
      type="button"
      disabled={isDisabled}
      className={[
        "inline-flex items-center justify-center rounded-lg font-semibold transition-all duration-150",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        "disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]",
        VARIANTS[variant],
        SIZES[size],
        fullWidth ? "w-full" : "",
        className,
      ].join(" ")}
      {...rest}
    >
      {loading && <Icon name="refresh" size={size === "sm" ? 13 : 15} className="animate-spin" />}
      {!loading && icon && <Icon name={icon} size={size === "sm" ? 14 : 16} />}
      {children}
      {iconRight && !loading && <Icon name={iconRight} size={size === "sm" ? 14 : 16} />}
    </button>
  );
}
