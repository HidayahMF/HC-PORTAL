import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Page, Card, DataTable } from '../../components/ui.jsx';
import { useFetch } from '../../api/useFetch.js';
import api, { errMsg } from '../../api/client.js';
import { useAuth } from '../../auth/AuthContext.jsx';

const FILTERABLE = ['NIP', 'Name', 'Jobtitle', 'Departemen', 'DivisionName', 'Status', 'CategoryName'];

const STATUS_TONE = {
  Tetap: 'bg-lime-soft text-navy',
  Kontrak: 'bg-soft text-mut',
};

const getColumns = (duplicateCounts, selected, toggle) => [
  {
    key: '_select',
    label: '',
    render: (r) => <input type="checkbox" aria-label={`Pilih ${r.NIP}`} checked={selected.has(String(r.NIP ?? '').trim())} onChange={() => toggle(r.NIP)} />,
  },
  {
    key: 'NIP',
    label: 'NIP',
    className: 'tnum whitespace-nowrap',
    render: (r) => {
      const nip = String(r.NIP ?? '').trim();
      const count = duplicateCounts.get(nip);
      return (
        <>
          {r.NIP}
          {count > 1 && (
            <Link
              to={`/hris/career-path?q=${encodeURIComponent(nip)}`}
              title="NIP muncul lebih dari satu kali. Periksa data master karyawan atau career path aktif."
              className="ml-2 inline-flex items-center whitespace-nowrap rounded-md bg-[#fdeaea] px-2 py-0.5 text-[11px] font-semibold text-[#b91c1c] no-underline hover:bg-[#f6d9d9] hover:underline"
            >
              ⚠ Duplikat ({count}) — lihat CareerPath
            </Link>
          )}
        </>
      );
    },
  },
  { key: 'Name', label: 'Nama', className: 'font-medium' },
  { key: 'DivisionName', label: 'Divisi' },
  { key: 'Departemen', label: 'Departemen' },
  {
    key: 'Jobtitle',
    label: 'Jabatan',
    render: (r) =>
      r.Jobtitle ? r.Jobtitle.trim() : (
        <Link
          to={`/hris/employees/${encodeURIComponent(r.NIP ?? '')}`}
          title="Isi job title / career path di halaman karyawan"
          className="inline-block whitespace-nowrap rounded-md bg-[#fdeaea] px-2 py-0.5 text-[11px] font-semibold text-[#b91c1c] no-underline hover:underline"
        >
          <span aria-hidden="true">⚠</span> Jobtitle kosong — isi
        </Link>
      ),
  },
  { key: 'CategoryName', label: 'Kategori' },
  { key: 'is_Active', label: 'Status HRIS', render: (r) => r.is_Active === '1' ? 'Aktif' : 'Nonaktif' },
  {
    key: 'Status',
    label: 'Status',
    render: (r) => {
      const v = r.Status || '-';
      const tone = STATUS_TONE[v] || 'bg-soft text-mut';
      return (
        <span className={`inline-block whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-semibold ${tone}`}>
          {v}
        </span>
      );
    },
  },
  { key: 'WorkingDate', label: 'Tgl Masuk', className: 'tnum whitespace-nowrap' },
  { key: 'NIK', label: 'NIK', className: 'tnum whitespace-nowrap' },
  { key: 'NPWP', label: 'NPWP', className: 'tnum whitespace-nowrap' },
  { key: 'BirthDate', label: 'Tgl Lahir', className: 'tnum whitespace-nowrap' },
  { key: 'EducationArchive', label: 'Pendidikan' },
  {
    key: 'Address',
    label: 'Alamat',
    render: (r) => {
      const v = r.Address || '';
      if (!v) return '-';
      return <span title={v} className="block max-w-[260px] truncate">{v}</span>;
    },
  },
  { key: 'Phone', label: 'Telepon', className: 'tnum whitespace-nowrap' },
  { key: 'StatusPajak', label: 'Status Pajak', className: 'whitespace-nowrap' },
];

export default function EmployeeTable() {
  const [keyword, setKeyword] = useState('');
  const [term, setTerm] = useState('');
  const [sort, setSort] = useState(null);
  const [filters, setFilters] = useState({});
  const [selected, setSelected] = useState(new Set());
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionOpen, setActionOpen] = useState(null);
  const [reason, setReason] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    const t = setTimeout(() => setTerm(keyword.trim()), 300);
    return () => clearTimeout(t);
  }, [keyword]);

  const path = term.length >= 2 ? `/export/employees?q=${encodeURIComponent(term)}` : '/export/employees';
  const { data, loading, error, reload } = useFetch(path, [term]);

  const allRows = useMemo(() => data?.data || [], [data]);
  const duplicateCounts = useMemo(() => {
    const counts = new Map();
    allRows.forEach((row) => {
      const nip = String(row.NIP ?? '').trim();
      if (nip) counts.set(nip, (counts.get(nip) || 0) + 1);
    });
    return counts;
  }, [allRows]);
  const toggle = (nip) => setSelected((current) => { const next = new Set(current); const key = String(nip ?? '').trim(); next.has(key) ? next.delete(key) : next.add(key); return next; });
  const columns = useMemo(() => getColumns(duplicateCounts, selected, toggle), [duplicateCounts, selected]);
  const activeNips = useMemo(() => new Set(allRows.filter((row) => selected.has(String(row.NIP ?? '').trim()) && row.is_Active === '1').map((row) => String(row.NIP).trim())), [allRows, selected]);
  const inactiveNips = useMemo(() => new Set(allRows.filter((row) => selected.has(String(row.NIP ?? '').trim()) && row.is_Active !== '1').map((row) => String(row.NIP).trim())), [allRows, selected]);
  const cancelAction = () => { if (!busy) { setActionOpen(null); setReason(''); setActionError(''); } };
  const openAction = (action) => { setReason(''); setActionError(''); setActionOpen(action); };
  const confirmAction = async () => {
    if (actionOpen === 'deactivate' && !reason.trim()) { setActionError('Alasan wajib diisi.'); return; }
    const nips = [...(actionOpen === 'deactivate' ? activeNips : inactiveNips)];
    setBusy(true); setActionError('');
    try {
      await api.post('/export/employees/deactivate', { action: actionOpen, nips, ...(actionOpen === 'deactivate' ? { reason } : {}) });
      setActionOpen(null); setReason(''); setSelected(new Set()); reload();
    } catch (e) { setActionError(errMsg(e)); }
    finally { setBusy(false); }
  };
  const totalRows = allRows.length;

  const rows = useMemo(() => {
    let out = allRows;
    const active = Object.entries(filters).filter(([, value]) => String(value ?? '').trim() !== '');
    if (active.length) {
      out = out.filter((row) => active.every(([key, value]) =>
        String(row[key] ?? '').toLowerCase().includes(String(value).trim().toLowerCase())
      ));
    }
    if (sort?.key) {
      const k = sort.key;
      const dir = sort.dir === 'desc' ? -1 : 1;
      out = [...out].sort((a, b) => {
        const av = a[k];
        const bv = b[k];
        if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
        const as = String(av ?? '').trim();
        const bs = String(bv ?? '').trim();
        if (k === 'NIP') {
          const an = as.replace(/\D/g, '');
          const bn = bs.replace(/\D/g, '');
          if (an && bn) return an.padStart(12, '0').localeCompare(bn.padStart(12, '0')) * dir;
        }
        return as.localeCompare(bs, undefined, { numeric: true, sensitivity: 'base' }) * dir;
      });
    }
    return out;
  }, [allRows, filters, sort]);

  const onFilterChange = (key, value) => setFilters((current) => ({ ...current, [key]: value }));

  const onSortChange = (key) => {
    setSort((s) => {
      if (!s || s.key !== key) return { key, dir: 'asc' };
      if (s.dir === 'asc') return { key, dir: 'desc' };
      return { key, dir: 'asc' };
    });
  };

  return (
    <Page title="Tabel Karyawan">
      <Card title="Data Employee Active">
        <form
          className="px-4 pt-4"
          onSubmit={(e) => {
            e.preventDefault();
            setTerm(keyword.trim());
          }}
        >
          <div className="field">
            <label htmlFor="emp-keyword">Kata Kunci</label>
            <input
              id="emp-keyword"
              type="text"
              className="w-full rounded-md border border-line bg-white px-3 py-2 text-[13px] text-navy placeholder:text-mut/70"
              placeholder="Cari berdasarkan NIP, Nama, Jabatan, Departemen…"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            <span className="text-[11.5px] text-mut">
              Ketik untuk mencari. Minimal 2 karakter. Kosongkan untuk menampilkan semua data.
            </span>
          </div>
        </form>

        {error && <p className="err">{error}</p>}
        {actionError && <p className="err">{actionError}</p>}
        {user?.canDeactivateEmployees && activeNips.size > 0 && <button type="button" className="btn mb-3 ml-4" disabled={busy} onClick={() => openAction('deactivate')}>{busy ? 'Memproses...' : `Nonaktifkan (${activeNips.size})`}</button>}
        {user?.canDeactivateEmployees && inactiveNips.size > 0 && <button type="button" className="btn mb-3 ml-2" disabled={busy} onClick={() => openAction('activate')}>{busy ? 'Memproses...' : `Aktifkan (${inactiveNips.size})`}</button>}
        {loading ? (
          <p className="muted">Memuat...</p>
        ) : (
          <>
            <div className="flex items-center gap-2 px-4 py-2.5 text-[12px] text-mut">
              <input type="checkbox" aria-label="Pilih semua karyawan" checked={rows.length > 0 && rows.every((r) => selected.has(String(r.NIP ?? '').trim()))} onChange={(e) => setSelected(e.target.checked ? new Set(rows.map((r) => String(r.NIP ?? '').trim())) : new Set())} />
              <span>Pilih semua</span>
              <span>Total {rows.length} data dari {totalRows} karyawan.</span>
            </div>
            <DataTable
              columns={columns}
              rows={rows}
              sortable
              sort={sort}
              onSortChange={onSortChange}
              filterable={FILTERABLE}
              filters={filters}
              onFilterChange={onFilterChange}
              preserveHeaderWhenEmpty
              rowKey={(r, i) => `${r.NIP || r.NIK || r.Name || 'row'}-${r.Jobtitle || ''}-${r.WorkingDate || ''}-${i}`}
            />
          </>
        )}
        {actionOpen && (
          <div
            className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
            role="presentation"
            onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) cancelAction(); }}
          >
            <div className="w-full max-w-md rounded-xl border border-line bg-white p-5 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="employee-action-title">
              <h2 id="employee-action-title" className="text-lg font-bold text-navy">{actionOpen === 'activate' ? 'Aktifkan Karyawan' : 'Nonaktifkan Karyawan'}</h2>
              <p className="mt-1 text-sm text-mut">{actionOpen === 'activate' ? inactiveNips.size : activeNips.size} karyawan akan {actionOpen === 'activate' ? 'diaktifkan' : 'dinonaktifkan'}.</p>
              {actionOpen === 'deactivate' && <><label htmlFor="deactivate-reason" className="mt-4 block">Alasan</label>
              <textarea
                id="deactivate-reason"
                className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-[13px] text-navy placeholder:text-mut/70"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
                autoFocus
                placeholder="Tulis alasan nonaktif..."
              />
              <p className="mt-1 text-right text-xs text-mut">{reason.length}/500</p></>}
              {actionError && <p className="err" role="alert">{actionError}</p>}
              <div className="mt-5 flex justify-end gap-2">
                <button type="button" className="btn sec" onClick={cancelAction} disabled={busy}>Batal</button>
                <button type="button" className="btn danger" onClick={confirmAction} disabled={busy || (actionOpen === 'deactivate' && !reason.trim())}>{busy ? 'Memproses...' : actionOpen === 'activate' ? 'Aktifkan' : 'Nonaktifkan'}</button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </Page>
  );
}