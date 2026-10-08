import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Page, Card } from '../../components/ui.jsx';
import Select from '../../components/fields/Select.jsx';
import DateField from '../../components/fields/DateField.jsx';
import FileField from '../../components/fields/FileField.jsx';
import { useFetch } from '../../api/useFetch.js';
import api, { errMsg } from '../../api/client.js';

// Field mengikuti ins_prof()/upd_prof() di service: [nama form, kolom DB].
const FIELDS = [
  { src: 'name', col: 'Name', label: 'Name' },
  { src: 'adddom', col: 'Addressdomisili', label: 'Address (Domisili)', type: 'textarea' },
  { src: 'keldom', col: 'Keldomisili', label: 'Kelurahan (Domisili)', type: 'textarea' },
  { src: 'kecdom', col: 'Kecdomisili', label: 'Kecamatan (Domisili)', type: 'textarea' },
  { src: 'kabkotadom', col: 'KabKotadomisili', label: 'Kabupaten/Kota (Domisili)', type: 'textarea' },
  { src: 'provdom', col: 'Provincedomisili', label: 'Province (Domisili)', type: 'textarea' },
  { src: 'nik', col: 'NIK', label: 'NIK' },
  { src: 'add', col: 'Address', label: 'Address (Identitas)', type: 'textarea' },
  { src: 'kel', col: 'Kelurahan', label: 'Kelurahan', type: 'textarea' },
  { src: 'kec', col: 'Kecamatan', label: 'Kecamatan', type: 'textarea' },
  { src: 'kabkota', col: 'KabupatenKota', label: 'Kabupaten/Kota', type: 'textarea' },
  { src: 'pos', col: 'PostalCode', label: 'Postal Code' },
  { src: 'prov', col: 'Province', label: 'Province', type: 'textarea' },
  { src: 'ph', col: 'Phone', label: 'Phone' },
  { src: 'em', col: 'Email', label: 'Email' },
  { src: 'bpl', col: 'BirthPlace', label: 'Birth Place' },
  { src: 'bd', col: 'BirthDate', label: 'Birth Date', type: 'date' },
  { src: 'gen', col: 'Gender', label: 'Gender', type: 'select', options: [['L', 'Laki-laki'], ['P', 'Perempuan']] },
  { src: 'mar', col: 'MaritalStatus', label: 'Marital Status', type: 'select', options: [['K', 'Kawin'], ['TK', 'Tidak Kawin']] },
  { src: 'ch', col: 'Child', label: 'Child', maxLength: 1 },
  { src: 'aga', col: 'Religion', label: 'Religion', type: 'select', options: [['Islam', 'Islam'], ['Kristen', 'Kristen'], ['Katolik', 'Katolik'], ['Hindu', 'Hindu'], ['Buddha', 'Buddha']] },
  { src: 'stt', col: 'EmployeeStatus', label: 'Status', type: 'select', options: [['P', 'Permanent'], ['C', 'Contract']] },
  { src: 'npwp', col: 'NPWP', label: 'NPWP' },
  { src: 'nric', col: 'NRIC', label: 'NRIC' },
  { src: 'bpjstk', col: 'BPJSTK', label: 'BPJSTK' },
  { src: 'bpjsks', col: 'BPJSKS', label: 'BPJSKS' },
  { src: 'fwo', col: 'FirstWorkingDate', label: 'First Working Date', type: 'date' },
  { src: 'wo', col: 'WorkingDate', label: 'Working Date', type: 'date' },
  { src: 'dept', col: 'DepartID', label: 'Departemen', type: 'dept' },
  { src: 'act', col: 'is_Active', label: 'is Active', type: 'select', options: [['1', 'Active'], ['0', 'InActive']] },
];

function toForm(emp) {
  const f = {};
  for (const { src, col, type } of FIELDS) {
    const v = emp[col];
    f[src] = type === 'date' ? (v ? String(v).slice(0, 10) : '') : (v == null ? '' : v);
  }
  return f;
}

export default function EmployeeForm({ mode = 'insert' }) {
  const editing = mode === 'update';
  const { nip } = useParams();
  const navigate = useNavigate();

  const { data: depts } = useFetch('/departments?level=Departemen');
  const [form, setForm] = useState({ act: '1', gen: 'L', mar: 'TK', aga: 'Islam', stt: 'P' });
  const [file, setFile] = useState(null);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing || !nip) return;
    let alive = true;
    api.get('/employees/' + nip)
      .then((res) => alive && setForm((f) => ({ ...f, ...toForm(res.data?.emp?.[0] || {}) })))
      .catch((e) => alive && setErr(errMsg(e)));
    return () => { alive = false; };
  }, [editing, nip]);

  const set = (src) => (e) => setForm((f) => ({ ...f, [src]: e.target.value }));
  const put = (src) => (v) => setForm((f) => ({ ...f, [src]: v }));
  const deptOptions = (depts || []).map((d) => [d.DepartID, `${d.DepartID} | ${d.NamaDepartemen}`]);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setErr('');
    try {
      const fd = new FormData();
      fd.append('nip', editing ? nip : (form.nip || ''));
      for (const { src } of FIELDS) fd.append(src, form[src] ?? '');
      if (file) fd.append('file', file);
      const res = editing
        ? await api.put('/employees/profiles/' + nip, fd)
        : await api.post('/employees/profiles', fd);
      navigate('/hris/employees/' + (res.data?.nip || (editing ? nip : form.nip)));
    } catch (e2) {
      setErr(errMsg(e2));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Page title={editing ? 'Edit Employee Profile' : 'Tambah Employee'}>
      <Card>
        {err ? <p className="err">{err}</p> : null}
        <form onSubmit={submit}>
          <table className="table"><tbody>
            <tr>
              <td style={{ width: 200 }}>NIP</td>
              <td>:</td>
              <td>
                <input
                  className="form-control"
                  type="text"
                  value={editing ? nip : (form.nip || '')}
                  readOnly={editing}
                  required
                  onChange={set('nip')}
                />
              </td>
            </tr>
            {FIELDS.map((f) => (
              <tr key={f.src}>
                <td>{f.label}</td>
                <td>:</td>
                <td>
                  {f.type === 'textarea' ? (
                    <textarea value={form[f.src] || ''} onChange={set(f.src)} />
                  ) : f.type === 'select' ? (
                    <Select value={form[f.src] || ''} options={f.options} onChange={put(f.src)} />
                  ) : f.type === 'dept' ? (
                    <Select searchable value={form[f.src] || ''} options={deptOptions} placeholder="-- Pilih Departemen --" onChange={put(f.src)} />
                  ) : f.type === 'date' ? (
                    <DateField value={form[f.src] || ''} onChange={put(f.src)} />
                  ) : (
                    <input type="text" maxLength={f.maxLength} value={form[f.src] || ''} onChange={set(f.src)} />
                  )}
                </td>
              </tr>
            ))}
            <tr>
              <td>Photo (JPG)</td>
              <td>:</td>
              <td><FileField file={file} onChange={setFile} /></td>
            </tr>
          </tbody></table>
          <div className="row" style={{ marginTop: 12, gap: 8 }}>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
            <button className="btn" type="button" onClick={() => navigate(-1)}>Batal</button>
          </div>
        </form>
      </Card>
    </Page>
  );
}