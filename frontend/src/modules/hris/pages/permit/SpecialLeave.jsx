import { useState } from 'react';
import { Page, Card, DataTable } from '../../components/ui.jsx';
import DateField from '../../components/fields/DateField.jsx';
import { useFetch } from '../../api/useFetch.js';

const pad = (n) => String(n).padStart(2, '0');
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const monthStart = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
};
const ddmmyyyy = (v) => {
  if (!v) return '';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '' : `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
};
const t = (v) => String(v ?? '').trim();

export default function SpecialLeave() {
  const [DateStart, setDateStart] = useState(monthStart());
  const [DateEnd, setDateEnd] = useState(today());
  const [q, setQ] = useState('');

  const { data, loading, error } = useFetch(
    `/permit/special?DateStart=${DateStart}&DateEnd=${DateEnd}`,
    [DateStart, DateEnd]
  );

  const all = Array.isArray(data) ? data : [];
  const term = q.trim().toLowerCase();
  const rows = all.filter((r) => !term
    || t(r.NIP).toLowerCase().includes(term)
    || t(r.Name).toLowerCase().includes(term)
    || t(r.SubGroup).toLowerCase().includes(term));

  const columns = [
    { key: 'NIP', label: 'NIP', render: (r) => t(r.NIP) },
    { key: 'Name', label: 'Name', render: (r) => t(r.Name) },
    {
      key: 'tanggal',
      label: 'Tanggal',
      render: (r) => (t(r.ProposeStartDate) === t(r.ProposeEndDate)
        ? ddmmyyyy(r.ProposeStartDate)
        : `${ddmmyyyy(r.ProposeStartDate)} s/d ${ddmmyyyy(r.ProposeEndDate)}`),
    },
    { key: 'SubGroup', label: 'Kategori', render: (r) => t(r.SubGroup) || '-' },
    { key: 'NumDays', label: 'Hari' },
    { key: 'Status', label: 'Status', render: (r) => t(r.Status) || '-' },
    { key: 'Description', label: 'Keterangan', render: (r) => t(r.Description) || '-' },
  ];

  return (
    <Page title="Cuti Khusus">
      <Card title="Periode">
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-[180px]">
            <label>Start</label>
            <DateField value={DateStart} onChange={setDateStart} />
          </div>
          <div className="w-[180px]">
            <label>End</label>
            <DateField value={DateEnd} onChange={setDateEnd} />
          </div>
        </div>
      </Card>

      <Card>
        {loading ? (
          <div className="muted">Memuat...</div>
        ) : error ? (
          <p className="err">{error}</p>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between gap-3">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari karyawan atau kategori…"
                aria-label="Cari special leave"
                className="max-w-xs"
              />
              <span className="muted tnum">{rows.length} dari {all.length}</span>
            </div>
            <DataTable columns={columns} rows={rows} empty="Tidak ada special leave pada periode ini" emptyHint="Ubah rentang periode." />
          </>
        )}
      </Card>
    </Page>
  );
}
