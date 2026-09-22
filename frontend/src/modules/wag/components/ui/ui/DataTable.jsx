import Skeleton from "./Skeleton";
import EmptyState from "./EmptyState";

export default function DataTable({
  columns,
  rows,
  rowKey = (r, i) => r.id ?? i,
  minWidth = 720,
  loading = false,
  skeletonRows = 5,
  emptyIcon = "info",
  emptyTitle = "Belum ada data",
  emptyDescription,
  emptyAction,
  footer,
  className = "",
}) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-surface-border bg-surface-card shadow-card ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse" style={{ minWidth }}>
          <thead>
            <tr className="border-b border-surface-divider bg-surface-muted">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={`sticky top-0 z-10 bg-surface-muted px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-widest text-txt-muted ${col.headerClassName || ""}`}
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-4">
                  <div className="space-y-3">
                    {Array.from({ length: skeletonRows }).map((_, i) => (
                      <div key={i} className="flex items-center gap-4">
                        <Skeleton className="h-4 flex-1" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                    ))}
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} action={emptyAction} />
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr
                  key={rowKey(row, i)}
                  className="border-b border-surface-divider transition-colors duration-100 last:border-b-0 hover:bg-surface-muted/70"
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3 align-middle text-sm ${col.className || ""}`}>
                      {col.render ? col.render(row, i) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {footer && <div className="border-t border-surface-divider bg-surface-muted px-4 py-2.5">{footer}</div>}
    </div>
  );
}
