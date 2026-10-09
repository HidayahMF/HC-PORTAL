import { useState } from 'react';
import { Page, Card, DataTable } from '../../components/ui.jsx';
import DateField from '../../components/fields/DateField.jsx';
import { useFetch } from '../../api/useFetch.js';
import api, { errMsg } from '../../api/client.js';

const emptyForm = {
  Id_TrainingCat: '1',
  Id_TrainingSubCat: '1',
  TrainingSubject: '',
  Institution: '',
  StartDate: '',
  EndDate: '',
  Duration: '',
};

const detailCols = [
  { key: 'NIP', label: 'NIP' },
  { key: 'Name', label: 'Nama' },
  { key: 'Joblevel', label: 'Jabatan' },
  { key: 'DeptName', label: 'Departemen' },
  { key: 'selected', label: 'Peserta', render: (r) => (r.selected ? 'Ya' : '-') },
];

function Detail({ code, onClose }) {
  const { data: detail, loading: l1, error: e1 } = useFetch(
    `/training/hc/participants/detail/${code}`
  );
  const { data: emp, loading: l2, error: e2 } = useFetch(
    `/training/hc/participants/employees?code=${encodeURIComponent(code)}`
  );
  return (
    <Card title="Detail Training">
      <button type="button" className="sec" onClick={onClose}>Tutup</button>
      {(l1 || l2) && <p className="muted">Memuat...</p>}
      {(e1 || e2) && <p className="err">{e1 || e2}</p>}
      {detail && (
        <table className="dtable" style={{ margin: '8px 0' }}>
          <tbody>
            {Object.entries(detail).map(([k, v]) => (
              <tr key={k}><th>{k}</th><td>{v}</td></tr>
            ))}
          </tbody>
        </table>
      )}
      <DataTable columns={detailCols} rows={emp?.data || []} />
    </Card>
  );
}

// Padanan hris/hc_training_participants.php + hc_training_participants_insert.php
export default function TrainingParticipants() {
  const { data: years } = useFetch('/training/hc/participants');
  const [year, setYear] = useState('');
  const [detailCode, setDetailCode] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [nips, setNips] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const list = years?.tahun || [];
  const activeYear = year || (list[0]?.tahun ?? '');

  const { data, loading, error, reload } = useFetch(
    `/training/hc/participants/table?year=${activeYear}`,
    [activeYear]
  );
  const { data: emp } = useFetch('/training/hc/participants/employees');

  const columns = [
    { key: 'TrainingSubject', label: 'Course' },
    { key: 'Institution', label: 'Institution' },
    { key: 'StartDate', label: 'Start Date' },
    { key: 'EndDate', label: 'End Date' },
    { key: 'Duration', label: 'Duration' },
    { key: 'Participants', label: 'Participants' },
    {
      key: 'act',
      label: 'Action',
      render: (r) => <button type="button" onClick={() => setDetailCode(r.code)}>Detail</button>,
    },
  ];

  const empCols = [
    {
      key: 'sel',
      label: '',
      render: (r) => (
        <input
          type="checkbox"
          checked={nips.includes(r.NIP)}
          onChange={() =>
            setNips((prev) => (prev.includes(r.NIP) ? prev.filter((n) => n !== r.NIP) : [...prev, r.NIP]))
          }
        />
      ),
    },
    { key: 'NIP', label: 'NIP' },
    { key: 'Name', label: 'Nama' },
    { key: 'Joblevel', label: 'Jabatan' },
    { key: 'DeptName', label: 'Departemen' },
  ];

  async function submit(ev) {
    ev.preventDefault();
    setBusy(true);
    setErr('');
    setMsg('');
    try {
      await api.post('/training/hc/participants', { ...form, NIP: nips });
      setMsg('Data Berhasil Disimpan');
      setForm(emptyForm);
      setNips([]);
      reload();
    } catch (e) {
      setErr(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <Page title="Peserta Pelatihan">
      <Card title="Pilih Tahun">
        <select value={activeYear} onChange={(e) => setYear(e.target.value)}>
          {list.map((r) => <option key={r.tahun} value={r.tahun}>{r.tahun}</option>)}
        </select>
      </Card>
      <Card>
        {loading && <p className="muted">Memuat...</p>}
        {error && <p className="err">{error}</p>}
        <DataTable columns={columns} rows={data?.data || []} />
      </Card>
      {detailCode && <Detail code={detailCode} onClose={() => setDetailCode(null)} />}
      <Card title="Tambah Peserta">
        <form onSubmit={submit}>
          <div>
            <label>Category</label>{' '}
            <label><input type="radio" name="Id_TrainingCat" value="1" checked={form.Id_TrainingCat === '1'} onChange={set('Id_TrainingCat')} /> TERPROGRAM</label>{' '}
            <label><input type="radio" name="Id_TrainingCat" value="2" checked={form.Id_TrainingCat === '2'} onChange={set('Id_TrainingCat')} /> TAMBAHAN</label>
          </div>
          <div>
            <label>Sub Category</label>
            <select value={form.Id_TrainingSubCat} onChange={set('Id_TrainingSubCat')}>
              <option value="1">MANDATORY</option>
              <option value="2">OPTIONAL</option>
            </select>
          </div>
          <div><label>Course Subject</label><input value={form.TrainingSubject} onChange={set('TrainingSubject')} /></div>
          <div><label>Institution</label><input value={form.Institution} onChange={set('Institution')} /></div>
          <div><label>Start Date</label><DateField value={form.StartDate} onChange={(v) => setForm({ ...form, StartDate: v })} /></div>
          <div><label>End Date</label><DateField value={form.EndDate} onChange={(v) => setForm({ ...form, EndDate: v })} /></div>
          <div><label>Duration</label><input value={form.Duration} onChange={set('Duration')} /></div>
          <DataTable columns={empCols} rows={emp?.data || []} />
          <p className="muted">Terpilih {nips.length} Karyawan</p>
          {err && <p className="err">{err}</p>}
          {msg && <p className="muted">{msg}</p>}
          <button disabled={busy}>{busy ? 'Menyimpan...' : 'Simpan'}</button>
        </form>
      </Card>
    </Page>
  );
}
