import { useState } from 'react';
import { Page, Card, DataTable } from '../../components/ui.jsx';
import api, { errMsg } from '../../api/client.js';

const COLUMNS = [
  { key: 'Descriptions', label: 'Inti' },
  { key: 'Level', label: 'Level' },
  { key: 'descr', label: 'Description' },
];

// Padanan hris/pride.php (tabel hris_Pride_* mungkin belum ada -> tampilkan error)
export default function Pride() {
  const [jobseq, setJobseq] = useState('');
  const [nip, setNip] = useState('');
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function load(e) {
    e.preventDefault();
    if (!jobseq) return;
    setBusy(true); setErr(''); setData(null);
    try {
      const res = await api.get(`/competence/pride/${encodeURIComponent(jobseq)}`, {
        params: nip ? { nip } : {},
      });
      setData(res.data);
    } catch (e2) {
      setErr(errMsg(e2));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page title="Pride">
      <Card title="Pilih Job Level">
        <form className="row" onSubmit={load}>
          <div>
            <label>JobSeq</label>
            <input value={jobseq} onChange={(e) => setJobseq(e.target.value)} />
          </div>
          <div>
            <label>NIP (opsional)</label>
            <input value={nip} onChange={(e) => setNip(e.target.value)} />
          </div>
          <button type="submit" disabled={busy}>{busy ? 'Memuat...' : 'Tampilkan'}</button>
        </form>
        {err && <p className="err">{err}</p>}
      </Card>

      {data && (
        <Card title={data.title || 'Kompetensi'}>
          {data.name && <p><b>{data.name}</b>{data.Joblevel ? ` - ${data.Joblevel}` : ''}</p>}
          <h4>Kompetensi Standard</h4>
          <DataTable columns={COLUMNS} rows={data.infostd || []} />
          {data.name && (
            <>
              <h4 style={{ marginTop: 16 }}>Kompetensi Actual {data.name}</h4>
              <DataTable columns={COLUMNS} rows={data.infoact || []} />
            </>
          )}
        </Card>
      )}
    </Page>
  );
}
