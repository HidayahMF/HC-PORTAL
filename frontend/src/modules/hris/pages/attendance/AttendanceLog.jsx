import { useState } from 'react';
import { Page, Card, DataTable } from '../../components/ui.jsx';
import DateField from '../../components/fields/DateField.jsx';
import { useFetch } from '../../api/useFetch.js';
import { UPLOAD_BASE } from '../../api/client.js';

const today = () => new Date().toISOString().slice(0, 10);
const txt = (v) => (typeof v === 'string' ? v.replace(/<[^>]*>/g, '') : v);
const photoUrl = (p) => `${UPLOAD_BASE}/${String(p).replace(/^\/+/, '')}`;

const fields = ['NAME', 'NIP', 'DATE', 'TIME', 'STATUS', 'ISWFH', 'ACTIVITY', 'COORDINATE'];

function Detail({ id, onClose }) {
  const { data, loading, error } = useFetch(`/attendance/logs/${id}`);
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'grid', placeItems: 'center', zIndex: 50 }} onClick={onClose}>
      <div className="card" style={{ minWidth: 340, maxWidth: 520, margin: 0, maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h4 style={{ margin: 0 }}>Detail Log</h4>
          <button className="sec" onClick={onClose}>Close</button>
        </div>
        {loading && <p className="muted">Memuat...</p>}
        {error && <p className="err">{error}</p>}
        {data && (
          <>
            {data.PHOTO ? <img src={photoUrl(data.PHOTO)} alt="foto" style={{ width: '100%', borderRadius: 6, marginTop: 12 }} /> : null}
            <table className="dtable" style={{ marginTop: 12 }}>
              <tbody>
                {fields.map((k) => (
                  <tr key={k}><th>{k}</th><td>{txt(data[k])}</td></tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}

export default function AttendanceLog() {
  const [form, setForm] = useState({ DateStart: today(), DateEnd: today() });
  const [filter, setFilter] = useState(form);
  const [detailId, setDetailId] = useState(null);
  const { data, loading, error } = useFetch(
    `/attendance/logs?DateStart=${filter.DateStart}&DateEnd=${filter.DateEnd}`,
    [filter.DateStart, filter.DateEnd]
  );
  const rows = data?.data || [];

  const columns = [
    { key: 'ID', label: 'ID' },
    { key: 'DATE', label: 'DATE' },
    { key: 'TIME', label: 'TIME' },
    { key: 'NIP', label: 'NIP' },
    { key: 'NAME', label: 'NAME' },
    { key: 'STATUS', label: 'STATUS', render: (r) => txt(r.STATUS) },
    { key: 'ISWFH', label: 'ISWFH', render: (r) => txt(r.ISWFH) },
    { key: 'act', label: '#', render: (r) => (r.ID ? <button onClick={() => setDetailId(r.ID)}>Detail</button> : null) },
  ];

  return (
    <Page title="Log Kehadiran">
      <Card title="Search">
        <form
          onSubmit={(e) => { e.preventDefault(); setFilter(form); }}
          className="row"
        >
          <div>
            <label>Start</label>
            <DateField value={form.DateStart} onChange={(v) => setForm({ ...form, DateStart: v })} />
          </div>
          <div>
            <label>End</label>
            <DateField value={form.DateEnd} onChange={(v) => setForm({ ...form, DateEnd: v })} />
          </div>
          <button type="submit">Submit</button>
        </form>
      </Card>
      <Card title="Log Attendance">
        {error && <p className="err">{error}</p>}
        {loading ? <p className="muted">Memuat...</p> : <DataTable columns={columns} rows={rows} />}
      </Card>
      {detailId != null && <Detail key={detailId} id={detailId} onClose={() => setDetailId(null)} />}
    </Page>
  );
}
