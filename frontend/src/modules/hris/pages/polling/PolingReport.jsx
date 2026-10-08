import { useState } from 'react';
import { Page, Card, DataTable } from '../../components/ui.jsx';
import { useFetch } from '../../api/useFetch.js';
import api, { errMsg } from '../../api/client.js';

const jawaban = (isi) => {
  if (isi === '1' || isi === 1) return 'Ya';
  if (isi === '0' || isi === 0) return 'Tidak';
  return isi;
};

// Padanan hris/polingReport.php (getlistPoling + getDataPoling)
export default function PolingReport() {
  const { data, loading, error } = useFetch('/polling');
  const [idPoling, setIdPoling] = useState('');
  const [chart, setChart] = useState(null);
  const [cerr, setCerr] = useState('');
  const [busy, setBusy] = useState(false);

  const list = data?.data || [];

  async function load(id) {
    setIdPoling(id);
    if (!id) { setChart(null); return; }
    setBusy(true); setCerr(''); setChart(null);
    try {
      const res = await api.post('/polling/chart', { idPoling: id });
      setChart(res.data);
    } catch (e) {
      setCerr(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  const rows = chart?.dataChart || [];
  const max = Math.max(1, ...rows.map((r) => parseInt(r.jumlah, 10) || 0));

  const columns = [
    { key: 'judul', label: 'Judul' },
    { key: 'isi', label: 'Jawaban', render: (r) => jawaban(r.isi) },
    { key: 'jumlah', label: 'Jumlah' },
    {
      key: 'bar', label: '',
      render: (r) => (
        <div style={{ background: '#1b6ca8', height: 14, width: `${(parseInt(r.jumlah, 10) || 0) / max * 100}%` }} />
      ),
    },
  ];

  return (
    <Page title="Data Report Poling">
      <Card title="Pilih Poling">
        <select value={idPoling} onChange={(e) => load(e.target.value)}>
          <option value="">Pilih Judul Poling</option>
          {list.map((p) => <option key={p.id} value={p.id}>{p.judul}</option>)}
        </select>
        {loading && <p className="muted">Memuat...</p>}
        {error && <p className="err">{error}</p>}
      </Card>
      <Card>
        {busy && <p className="muted">Memuat...</p>}
        {cerr && <p className="err">{cerr}</p>}
        {chart && <DataTable columns={columns} rows={rows} />}
      </Card>
    </Page>
  );
}
