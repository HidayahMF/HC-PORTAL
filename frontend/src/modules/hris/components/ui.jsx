import { Link } from 'react-router-dom';

/**
 * Header halaman. Tanpa kicker/eyebrow: judul membawa bobotnya sendiri.
 * subjudul opsional hanya untuk satu baris konteks yang benar-benar menambah informasi.
 */
export function Page({ title, subtitle, actions, children }) {
  return (
    <div>
      <div className="page-head">
        <div>
          <h1>{title}</h1>
          {subtitle && <p className="sub">{subtitle}</p>}
        </div>
        {actions && <div className="row" style={{ alignItems: 'center' }}>{actions}</div>}
      </div>
      {children}
    </div>
  );
}

export function Card({ children, title, actions, className = '' }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <div className="card-head">
          {title ? <h4>{title}</h4> : <span />}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Field({ label, children }) {
  return (
    <div className="field">
      {label && <label>{label}</label>}
      {children}
    </div>
  );
}

/** Tabel data: angka tabular, scroll horizontal aman, empty state bermakna.
 *  Sortasi/filter bersifat opt-in; komponen ini tidak menyimpan state, induknya yang memegang. */
export function DataTable({
  columns,
  rows,
  empty,
  emptyHint,
  sortable = false,
  sort = null,
  onSortChange = null,
  filterable = [],
  filters = {},
  onFilterChange = null,
  rowKey = null,
}) {
  const canSort = sortable && !!onSortChange;
  const hasFilters = Array.isArray(filterable) && filterable.length > 0;

  if (!rows?.length) {
    return (
      <div className="px-5 py-10 text-center text-[13px] text-mut">
        <b className="mb-1 block text-[14px] text-navy">{empty || 'Tidak ada data untuk ditampilkan'}</b>
        {emptyHint || 'Ubah filter atau tambahkan data untuk melihat isinya di sini.'}
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-y border-line text-left text-[11px] uppercase tracking-[0.05em] text-mut">
            {columns.map((c) => (
              <th key={c.key} className="whitespace-nowrap px-4 py-2.5 font-semibold">
                {canSort ? (
                  <button
                    type="button"
                    onClick={() => onSortChange(c.key)}
                    className="inline-flex items-center gap-1 uppercase tracking-[0.05em]"
                  >
                    {c.label}
                    {sort?.key === c.key && <span aria-hidden="true">{sort.dir === 'desc' ? '▼' : '▲'}</span>}
                  </button>
                ) : (
                  c.label
                )}
              </th>
            ))}
          </tr>
          {hasFilters && (
            <tr className="border-y border-line">
              {columns.map((c) => (
                <th key={c.key} className="whitespace-nowrap px-4 py-2 font-normal">
                  {filterable.includes(c.key) ? (
                    <input
                      type="text"
                      className="w-full rounded-md border border-line bg-white px-2 py-1 text-[11.5px] font-normal normal-case text-navy placeholder:text-mut/70"
                      placeholder="Filter"
                      value={filters[c.key] ?? ''}
                      onChange={(e) => onFilterChange && onFilterChange(c.key, e.target.value)}
                    />
                  ) : null}
                </th>
              ))}
            </tr>
          )}
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={rowKey ? rowKey(r) : i} className="border-b border-line last:border-0 hover:bg-soft">
              {columns.map((c) => (
                <td key={c.key} className={`px-4 py-2.5 align-top text-navy${c.className ? ' ' + c.className : ''}`}>
                  {c.render ? c.render(r) : (r[c.key] ?? '-')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LinkButton({ to, children, variant = '' }) {
  return <Link className={`btn ${variant}`} to={to}>{children}</Link>;
}
