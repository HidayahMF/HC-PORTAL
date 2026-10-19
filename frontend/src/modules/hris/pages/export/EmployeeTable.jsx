import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Page, Card, DataTable } from '../../components/ui.jsx';
import { useFetch } from '../../api/useFetch.js';

const FILTERABLE = ['NIP', 'Name', 'Jobtitle', 'Departemen', 'DivisionName', 'Status', 'CategoryName'];

const STATUS_TONE = {
  Tetap: 'bg-lime-soft text-navy',
  Kontrak: 'bg-soft text-mut',
};

const getColumns = (duplicateCounts) => [
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

  useEffect(() => {
    const t = setTimeout(() => setTerm(keyword.trim()), 300);
    return () => clearTimeout(t);
  }, [keyword]);

  const path = term.length >= 2 ? `/export/employees?q=${encodeURIComponent(term)}` : '/export/employees';
  const { data, loading, error } = useFetch(path, [term]);

  const allRows = useMemo(() => data?.data || [], [data]);
  const duplicateCounts = useMemo(() => {
    const counts = new Map();
    allRows.forEach((row) => {
      const nip = String(row.NIP ?? '').trim();
      if (nip) counts.set(nip, (counts.get(nip) || 0) + 1);
    });
    return counts;
  }, [allRows]);
  const columns = useMemo(() => getColumns(duplicateCounts), [duplicateCounts]);
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
        {loading ? (
          <p className="muted">Memuat...</p>
        ) : (
          <>
            <p className="px-4 py-2.5 text-[12px] text-mut">
              Total {rows.length} data dari {totalRows} karyawan aktif.
            </p>
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
      </Card>
    </Page>
  );
}