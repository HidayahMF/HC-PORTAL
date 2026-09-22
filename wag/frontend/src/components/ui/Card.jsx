export default function Card({ children, className = "", hover = false, ...rest }) {
  return (
    <div
      className={`rounded-2xl border border-surface-border bg-surface-card shadow-card ${
        hover ? "transition-shadow duration-150 hover:shadow-card-hover" : ""
      } ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
