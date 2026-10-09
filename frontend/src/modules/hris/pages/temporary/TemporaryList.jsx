import { useState } from 'react';
import { Page, Card, DataTable } from '../../components/ui.jsx';
import { useFetch } from '../../api/useFetch.js';
import api, { errMsg } from '../../api/client.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n) => String(n).padStart(2, '0');

function fmtDate(v) {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// Padanan hris/employee_temporary.php + employeeTempConfirm(_Act)
export default function TemporaryList() {
  const { data, loading, error, reload } = useFetch('/temporary');
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function openConfirm(r) {
    setMsg('');
    setErr('');
    const date = String(r.InpDate);
    try {
      const res = await api.get(
        `/temporary/confirm/${encodeURIComponent(r.NIP)}/${encodeURIComponent(date)}`
      );
      setConfirm({ NIP: r.NIP, date, info: res.data, nama: r.nama });
    } catch (e) {
      setErr(errMsg(e));
    }
  }

  async function doConfirm() {
    setBusy(true);
    setErr('');
    setMsg('');
    try {
      const res = await api.post('/temporary/confirm', { NIP: confirm.NIP, date: confirm.date });
      setMsg(`NIP ${confirm.NIP} tervalidasi. ${JSON.stringify(res.data)}`);
      setConfirm(null);
      reload();
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  const columns = [
    { key: 'NIP', label: 'NIP' },
    { key: 'nama', label: 'NAME' },
    { key: 'Phone', label: 'PHONE' },
    { key: 'Email', label: 'EMAIL' },
    { key: 'InpDate', label: 'INPUT DATE', render: (r) => fmtDate(r.InpDate) },
    {
      key: 'Status',
      label: 'STATUS',
      render: (r) =>
        r.Status == 1 ? (
          <span className="pill" style={{ background: '#fecaca', color: '#991b1b' }}>Unconfirmed</span>
        ) : (
          <span className="pill" style={{ background: '#bbf7d0', color: '#166534' }}>Confirmed</span>
        ),
    },
    {
      key: 'action',
      label: 'ACTION',
      render: (r) =>
        r.Status == 1 ? (
          <button type="button" onClick={() => openConfirm(r)}>Confirm</button>
        ) : (
          <button type="button" disabled>Confirm</button>
        ),
    },
  ];

  return (
    <Page title="Karyawan Sementara">
      <Card>
        {loading && <p className="muted">Memuat...</p>}
        {error && <p className="err">{error}</p>}
        {msg && <p className="muted">{msg}</p>}
        {err && <p className="err">{err}</p>}
        <DataTable columns={columns} rows={Array.isArray(data) ? data : []} />
      </Card>
      {confirm && (
        <Card title="Konfirmasi Update">
          <p>
            Apakah anda yakin akan mengupdate data NIP <b>{confirm.NIP}</b> ({confirm.nama})?
          </p>
          <div className="row">
            <button type="button" className="danger" onClick={doConfirm} disabled={busy}>
              {busy ? 'Menyimpan...' : 'Update'}
            </button>
            <button type="button" className="sec" onClick={() => setConfirm(null)} disabled={busy}>
              Cancel
            </button>
          </div>
        </Card>
      )}
    </Page>
  );
}
