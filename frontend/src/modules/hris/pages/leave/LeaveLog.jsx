import { useState } from 'react';
import { Page, Card, DataTable } from '../../components/ui.jsx';
import DateField from '../../components/fields/DateField.jsx';
import { useFetch } from '../../api/useFetch.js';
import api, { errMsg } from '../../api/client.js';

const today = () => new Date().toISOString().slice(0, 10);
const pad = (n) => String(n).padStart(2, '0');
const ddmmyyyy = (v) => {
  if (!v) return '';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '' : `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
};

const columns = [
  { key: 'DATE', label: 'Tanggal' },
  { key: 'NIP', label: 'NIP' },
  { key: 'Name', label: 'Nama' },
  { key: 'NamaDepartemen', label: 'Bagian' },
  { key: 'Jenis-Cuti', label: 'Jenis-Cuti' },
  { key: 'Remark', label: 'Remark' },
];

// Padanan hris/log_cuti.php (cuti_datatable + generate_cuti + infoCutiGroupHeadDeptHead)
export default function LeaveLog() {
  const [DateStart, setDateStart] = useState(today());
  const [DateEnd, setDateEnd] = useState(today());
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');

  const { data, loading, error } = useFetch(
    `/leave/transactions?DateStart=${DateStart}&DateEnd=${DateEnd}`,
    [DateStart, DateEnd]
  );

  const rows = data?.data || [];
  const totalDays = rows.length;
  const employees = new Set(rows.map((r) => r.NIP)).size;
  const byType = rows.reduce((acc, r) => {
    const k = r['Jenis-Cuti'] || '-';
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});

  async function run(kind) {
    setBusy(kind);
    setMsg('');
    setErr('');
    try {
      const res =
        kind === 'generate'
          ? await api.post('/leave/generate')
          : await api.post('/leave/notify-heads');
      const label = kind === 'generate' ? 'Generate Cuti' : 'Notif Atasan';
      setMsg(`${label}: ${JSON.stringify(res.data)}`);
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy('');
    }
  }

  return (
    <Page title="Log Cuti Tahunan/Besar">
      <Card title="Search">
        <div className="row">
          <div>
            <label>Start</label>
            <DateField value={DateStart} onChange={setDateStart} />
          </div>
          <div>
            <label>End</label>
            <DateField value={DateEnd} onChange={setDateEnd} />
          </div>
          <button type="button" className="btn" onClick={() => run('generate')} disabled={!!busy}>
            {busy === 'generate' ? 'Memproses...' : 'Generate Cuti'}
          </button>
          <button type="button" className="btn sec" onClick={() => run('notify')} disabled={!!busy}>
            {busy === 'notify' ? 'Mengirim...' : 'Notif Atasan'}
          </button>
        </div>
        {msg && <p className="muted">{msg}</p>}
        {err && <p className="err">{err}</p>}
      </Card>
      <Card>
        <div className="flex flex-wrap items-center gap-x-8 gap-y-5">
          <div>
            <div className="text-[11.5px] font-semibold uppercase tracking-wide text-mut">Total Hari Cuti</div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-[42px] font-extrabold leading-none text-navy tnum">{totalDays}</span>
              <span className="text-[14px] font-semibold text-mut">hari</span>
            </div>
            <div className="mt-1 text-[12.5px] text-mut">{ddmmyyyy(DateStart)} s/d {ddmmyyyy(DateEnd)}</div>
          </div>
          <div className="h-16 w-px bg-line" />
          <div>
            <div className="text-[11.5px] font-semibold uppercase tracking-wide text-mut">Karyawan</div>
            <div className="mt-1 text-[28px] font-extrabold leading-none text-navy tnum">{employees}</div>
          </div>
          {Object.entries(byType).map(([k, v]) => (
            <div key={k}>
              <div className="text-[11.5px] font-semibold uppercase tracking-wide text-mut">{k}</div>
              <div className="mt-1 text-[28px] font-extrabold leading-none text-navy tnum">{v}</div>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        {loading && <p className="muted">Memuat...</p>}
        {error && <p className="err">{error}</p>}
        <DataTable columns={columns} rows={data?.data || []} />
      </Card>
    </Page>
  );
}
