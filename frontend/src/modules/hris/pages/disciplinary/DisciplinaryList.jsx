import { useState } from 'react';
import { Page, Card, DataTable } from '../../components/ui.jsx';
import DateField from '../../components/fields/DateField.jsx';
import { useFetch } from '../../api/useFetch.js';
import api, { errMsg, UPLOAD_BASE } from '../../api/client.js';

const EMPTY = {
  DeptID: '', NIP: '', IncidentDate: '', incidentTime: '', IncidentPlace: '',
  WarningNumber: '', WarningfStartDate: '', WarningEndDate: '', OffenceType: '',
  Description: '', EmployeeStatement: '', NotifToEmployer: '', NotifToEmployee: '',
  NotifConsequence: '', witnessed_by: '', witnessed_date: '', SubmitedBy: '',
  SubmitedDate: '', EmployeeSignDate: '', HRManagerSign: '', HRManagerDate: '',
};

const pad = (n) => String(n).padStart(2, '0');
function fmtDate(v) {
  if (!v) return '';
  const s = String(v).slice(0, 10);
  const [y, m, d] = s.split('-');
  return y ? `${d}-${m}-${y}` : s;
}
const ymd = (v) => (v ? String(v).slice(0, 10) : '');

export default function DisciplinaryList() {
  const { data, loading, error, reload } = useFetch('/disciplinary');
  const { data: opts } = useFetch('/disciplinary/input-options');

  const [form, setForm] = useState(EMPTY);
  const [file, setFile] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [offences, setOffences] = useState([]);
  const [deptEmployees, setDeptEmployees] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const warnings = opts?.RefWarning || [];
  const employees = deptEmployees ?? opts?.Employee ?? [];

  async function loadOffences(wn) {
    if (!wn) { setOffences([]); return; }
    try {
      const res = await api.get('/disciplinary/ref-offence', { params: { WarningNumber: wn } });
      setOffences(Array.isArray(res.data) ? res.data : []);
    } catch (e) { setErr(errMsg(e)); setOffences([]); }
  }

  async function loadDeptEmployees(deptId) {
    if (!deptId) { setDeptEmployees(null); return; }
    try {
      const res = await api.get('/disciplinary/employees-by-dept', { params: { DeptID: deptId } });
      setDeptEmployees(Array.isArray(res.data) ? res.data : []);
    } catch (e) { setErr(errMsg(e)); setDeptEmployees([]); }
  }

  function change(name, value) {
    const next = { ...form, [name]: value };
    if (name === 'WarningNumber' || name === 'WarningfStartDate') {
      const sel = warnings.find((w) => String(w.WarningNumber) === String(next.WarningNumber));
      const dur = sel ? parseInt(sel.WarningMonthDuration, 10) : NaN;
      if (next.WarningNumber && next.WarningfStartDate && !Number.isNaN(dur)) {
        const d = new Date(next.WarningfStartDate);
        d.setMonth(d.getMonth() + dur);
        next.WarningEndDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      }
      if (name === 'WarningNumber') loadOffences(value);
    }
    if (name === 'DeptID') loadDeptEmployees(value);
    setForm(next);
  }

  function openNew() {
    setForm(EMPTY); setFile(null); setOffences([]); setDeptEmployees(null);
    setEditing(null); setMsg(''); setErr(''); setShowForm(true);
  }

  async function openEdit(r) {
    setMsg(''); setErr('');
    const date = ymd(r.IncidentDate);
    try {
      const res = await api.get(
        `/disciplinary/${encodeURIComponent(r.NIP)}/${date}/${encodeURIComponent(r.IncidentSeq)}`
      );
      const rec = res.data || {};
      setForm(Object.fromEntries(Object.keys(EMPTY).map((k) => [k, rec[k] == null ? '' : String(rec[k])])));
      setEditing({ nip: r.NIP, date, seq: r.IncidentSeq });
      setFile(null); setOffences([]); setDeptEmployees(null);
      if (rec.WarningNumber) await loadOffences(rec.WarningNumber);
      if (rec.DeptID) await loadDeptEmployees(rec.DeptID);
      setShowForm(true);
    } catch (e) { setErr(errMsg(e)); }
  }

  async function save(e) {
    e.preventDefault();
    setBusy(true); setMsg(''); setErr('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v !== '' && v != null) fd.append(k, v); });
      if (file) fd.append('file', file);
      if (editing) {
        await api.put(
          `/disciplinary/${encodeURIComponent(editing.nip)}/${editing.date}/${encodeURIComponent(editing.seq)}`,
          fd
        );
        setMsg('Perubahan tersimpan.');
      } else {
        await api.post('/disciplinary', fd);
        setMsg('Data tersimpan.');
      }
      setShowForm(false); setEditing(null); setForm(EMPTY); setFile(null);
      reload();
    } catch (e2) { setErr(errMsg(e2)); }
    finally { setBusy(false); }
  }

  async function remove(r) {
    if (!confirm(`Hapus pelanggaran ${r.NIP} ${ymd(r.IncidentDate)}?`)) return;
    setMsg(''); setErr('');
    try {
      await api.delete(
        `/disciplinary/${encodeURIComponent(r.NIP)}/${ymd(r.IncidentDate)}/${encodeURIComponent(r.IncidentSeq)}`
      );
      setMsg('Data dihapus.'); reload();
    } catch (e) { setErr(errMsg(e)); }
  }

  const columns = [
    { key: 'NIP', label: 'NIP' },
    { key: 'Name', label: 'Nama' },
    { key: 'DeptName', label: 'Departemen' },
    { key: 'IncidentDate', label: 'Tanggal Kejadian', render: (r) => fmtDate(r.IncidentDate) },
    { key: 'Offence', label: 'Tipe Kesalahan' },
    { key: 'WarningNumber', label: 'Peringatan', render: (r) => String(r.WarningNumber || '').toUpperCase() },
    {
      key: 'WarningLeter', label: 'File',
      render: (r) => (r.WarningLeter
        ? <a href={`${UPLOAD_BASE}/bap/hris/disciplinary/${r.WarningLeter}`} target="_blank" rel="noreferrer">Lihat</a>
        : null),
    },
    {
      key: 'action', label: 'Action',
      render: (r) => (
        <span className="row" style={{ gap: 6 }}>
          <button type="button" onClick={() => openEdit(r)}>Edit</button>
          <button type="button" className="danger" onClick={() => remove(r)}>Hapus</button>
        </span>
      ),
    },
  ];

  const text = (name) => (
    <div>
      <label>{name}</label>
      <input value={form[name]} onChange={(e) => change(name, e.target.value)} />
    </div>
  );
  const dateField = (name, label) => (
    <div>
      <label>{label || name}</label>
      <DateField value={form[name]} onChange={(v) => change(name, v)} />
    </div>
  );
  const area = (name) => (
    <div style={{ flex: 1, minWidth: 260 }}>
      <label>{name}</label>
      <textarea rows={2} maxLength={255} value={form[name]} onChange={(e) => change(name, e.target.value)} />
    </div>
  );
  const sel = (name, list, keyFn, labelFn, extra) => (
    <div {...extra}>
      <label>{name}</label>
      <select value={form[name]} onChange={(e) => change(name, e.target.value)}>
        <option value=""></option>
        {(list || []).map((it, i) => (
          <option key={keyFn(it) ?? i} value={keyFn(it)}>{labelFn(it)}</option>
        ))}
      </select>
    </div>
  );

  return (
    <Page
      title="Kedisiplinan"
      actions={!showForm && <button type="button" onClick={openNew}>+ Tambah</button>}
    >
      {msg && <p className="muted">{msg}</p>}
      {err && <p className="err">{err}</p>}

      {showForm && (
        <Card title={editing ? 'Edit Pelanggaran' : 'Tambah Pelanggaran'}>
          <form onSubmit={save}>
            <div className="row">
              {sel('DeptID', opts?.Dept, (d) => d.DeptCode, (d) => d.DeptName)}
              {sel('NIP', employees, (e2) => e2.NIP, (e2) => `[${e2.NIP}] ${e2.Name}`)}
            </div>
            <div className="row">
              {dateField('IncidentDate', 'Tanggal Kejadian')}
              {text('incidentTime')}
              {text('IncidentPlace')}
            </div>
            <div className="row">
              {sel('WarningNumber', warnings, (w) => w.WarningNumber, (w) => w.WarningNumber)}
              {dateField('WarningfStartDate', 'Mulai Berlaku')}
              {dateField('WarningEndDate', 'Masa Berakhir')}
              {sel('OffenceType', offences, (o) => o.OffenceType, (o) => o.Description)}
            </div>
            <div className="row">{area('Description')}{area('EmployeeStatement')}</div>
            <div className="row">{area('NotifToEmployer')}{area('NotifToEmployee')}{area('NotifConsequence')}</div>
            <div className="row">
              {sel('witnessed_by', opts?.Employee, (e2) => e2.NIP, (e2) => `[${e2.NIP}] ${e2.Name}`)}
              {dateField('witnessed_date', 'Tanggal Saksi')}
              {sel('SubmitedBy', opts?.Employee, (e2) => e2.NIP, (e2) => `[${e2.NIP}] ${e2.Name}`)}
              {dateField('SubmitedDate', 'Tanggal Pengajuan')}
            </div>
            <div className="row">
              {dateField('EmployeeSignDate', 'Tanggal Ttd Karyawan')}
              <div>
                <label>Lampiran (JPG)</label>
                <input type="file" accept="image/jpeg" onChange={(e) => setFile(e.target.files[0] || null)} />
              </div>
              {sel('HRManagerSign', opts?.HRManager, (e2) => e2.NIP, (e2) => `[${e2.NIP}] ${e2.Name}`)}
              {dateField('HRManagerDate', 'Tanggal Ttd Manajer HR')}
            </div>
            <div className="row" style={{ marginTop: 12 }}>
              <button type="submit" disabled={busy}>{busy ? 'Menyimpan...' : 'Simpan'}</button>
              <button type="button" className="sec" disabled={busy} onClick={() => { setShowForm(false); setEditing(null); setForm(EMPTY); }}>Batal</button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        {loading && <p className="muted">Memuat...</p>}
        {error && <p className="err">{error}</p>}
        <DataTable columns={columns} rows={Array.isArray(data) ? data : []} />
      </Card>
    </Page>
  );
}
