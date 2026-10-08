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

export default function Permit() {
  const [DateStart, setDateStart] = useState(monthStart());
  const [DateEnd, setDateEnd] = useState(today());
  const [q, setQ] = useState('');

  const { data, loading, error } = useFetch(
    `/permit?DateStart=${DateStart}&DateEnd=${DateEnd}`,
    [DateStart, DateEnd]
  );

  const all = Array.isArray(data) ? data : [];
  const term = q.trim().toLowerCase();
  const rows = all.filter((r) => !term
    || t(r.NIP).toLowerCase().includes(term)
    || t(r.Name).toLowerCase().includes(term));

  const employees = new Set(all.map((r) => r.NIP)).size;
  const totalDays = all.reduce((s, r) => s + (Number(r.NumDays) || 0), 0);

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
    { key: 'Type', label: 'Type', render: (r) => t(r.Type) },
    { key: 'Group', label: 'Group', render: (r) => t(r.Group) },
    { key: 'SubGroup', label: 'Sub Group', render: (r) => t(r.SubGroup) },
    { key: 'NumDays', label: 'Days' },
    { key: 'Status', label: 'Status', render: (r) => t(r.Status) || '-' },
    { key: 'Description', label: 'Description', render: (r) => t(r.Description) || '-' },
  ];

  return (
    <Page title="Permit">
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
        <div className="flex flex-wrap items-center gap-x-8 gap-y-5">
          <div>
            <div className="text-[11.5px] font-semibold uppercase tracking-wide text-mut">Total Permit</div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-[42px] font-extrabold leading-none text-navy tnum">{all.length}</span>
              <span className="text-[14px] font-semibold text-mut">pengajuan</span>
            </div>
            <div className="mt-1 text-[12.5px] text-mut">{ddmmyyyy(DateStart)} s/d {ddmmyyyy(DateEnd)}</div>
          </div>
          <div className="h-16 w-px bg-line" />
          <div>
            <div className="text-[11.5px] font-semibold uppercase tracking-wide text-mut">Karyawan</div>
            <div className="mt-1 text-[28px] font-extrabold leading-none text-navy tnum">{employees}</div>
          </div>
          <div>
            <div className="text-[11.5px] font-semibold uppercase tracking-wide text-mut">Total Hari</div>
            <div className="mt-1 text-[28px] font-extrabold leading-none text-navy tnum">{totalDays}</div>
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
                placeholder="Cari karyawan (nama atau NIP)…"
                aria-label="Cari karyawan"
                className="max-w-xs"
              />
              <span className="muted tnum">{rows.length} dari {all.length}</span>
            </div>
            <DataTable columns={columns} rows={rows} empty="Tidak ada permit pada periode ini" emptyHint="Ubah rentang periode." />
          </>
        )}
      </Card>
    </Page>
  );
}
