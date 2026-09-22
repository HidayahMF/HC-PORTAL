export default function PageHeader({ title, description, actions, className = "" }) {
  return (
    <div className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${className}`}>
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight text-txt">{title}</h1>
        {description && <p className="mt-1 text-[13px] text-txt-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
