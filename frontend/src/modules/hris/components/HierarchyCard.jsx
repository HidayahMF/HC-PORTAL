import { Link } from 'react-router-dom';
import { Card, DataTable } from './ui.jsx';
import { useFetch } from '../api/useFetch.js';
import { IcArrowUp, IcArrowDown } from '../app/icons.jsx';

const initials = (s = '') => s.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'HR';
const trim = (s) => String(s ?? '').trim();

function NameCell({ value }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-navy text-[10.5px] font-bold text-lime">{initials(value)}</span>
      <span className="whitespace-nowrap font-medium text-navy">{trim(value)}</span>
    </span>
  );
}

const LevelCell = ({ row }) => {
  const v = trim(row.LevelName) || trim(row.Level);
  return v ? <span className="whitespace-nowrap rounded-md bg-soft px-2 py-0.5 text-[11px] font-semibold text-navy">{v}</span> : '-';
};

const NIP_CELL = { key: 'NIP', label: 'NIP', render: (r) => <Link to={'/hris/employees/' + trim(r.NIP)} className="tnum whitespace-nowrap text-navy no-underline hover:underline">{trim(r.NIP)}</Link> };
const NAME_CELL = { key: 'Name', label: 'Nama', render: (r) => <Link to={'/hris/employees/' + trim(r.NIP)} className="no-underline hover:underline"><NameCell value={r.Name} /></Link> };
const LEVEL_CELL = { key: 'LevelName', label: 'Level', render: (r) => <LevelCell row={r} /> };

function Section({ tone, title, subtitle, columns, rows, empty }) {
  const isUp = tone === 'up';
  return (
    <Card>
      <div className="mb-4 flex items-start gap-3">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-white ${isUp ? 'bg-lime' : 'bg-[#EF4444]'}`}>
          {isUp ? <IcArrowUp width={18} height={18} /> : <IcArrowDown width={18} height={18} />}
        </span>
        <div>
          <h4 className="text-[15px] font-bold text-navy">{title}</h4>
          <p className="text-[12.5px] text-mut">{subtitle}</p>
        </div>
        <span className="ml-auto self-center rounded-md bg-soft px-2 py-0.5 text-[11.5px] font-semibold text-navy tnum">{rows.length}</span>
      </div>
      <DataTable columns={columns} rows={rows} empty={empty} emptyHint="Belum ada data pada struktur ini." />
    </Card>
  );
}

/** Hierarki atasan langsung + bawahan langsung untuk satu NIP. */
export default function HierarchyCard({ nip }) {
  const { data, loading, error } = useFetch(`/organization/hierarchy/${nip}`);

  if (loading) return <Card><p className="muted">Memuat hierarki…</p></Card>;
  if (error) return <Card><p className="err">{error}</p></Card>;

  const top = data?.top || [];
  const down = data?.down || [];

  const topCols = [
    NIP_CELL,
    NAME_CELL,
    { key: 'NamaDepartemen', label: 'Departemen', render: (r) => trim(r.NamaDepartemen) || '-' },
    LEVEL_CELL,
  ];
  const downCols = [
    NIP_CELL,
    NAME_CELL,
    { key: 'DepartName', label: 'Departemen', render: (r) => trim(r.DepartName) || '-' },
    { key: 'NamaDepartemen', label: 'Depart Induk', render: (r) => trim(r.NamaDepartemen) || '-' },
    LEVEL_CELL,
  ];

  return (
    <>
      <Section tone="up" title="Hirarki Atasan Langsung" subtitle="Karyawan yang berada di atas dalam struktur hierarki." columns={topCols} rows={top} empty="Tidak ada data atasan langsung" />
      <Section tone="down" title="Hirarki Bawahan Langsung" subtitle="Karyawan yang berada di bawah dalam struktur hierarki." columns={downCols} rows={down} empty="Tidak ada data bawahan langsung" />
    </>
  );
}
