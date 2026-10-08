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

/** Tabel data: angka tabular, scroll horizontal aman, empty state bermakna. */
export function DataTable({ columns, rows, empty, emptyHint }) {
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
            {columns.map((c) => <th key={c.key} className="whitespace-nowrap px-4 py-2.5 font-semibold">{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-line last:border-0 hover:bg-soft">
              {columns.map((c) => (
                <td key={c.key} className="px-4 py-2.5 align-top text-navy">{c.render ? c.render(r) : r[c.key]}</td>
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
