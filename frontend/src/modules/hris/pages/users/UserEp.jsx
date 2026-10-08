import { useState } from 'react';
import { Page, Card, DataTable } from '../../components/ui.jsx';
import { useFetch } from '../../api/useFetch.js';
import api, { errMsg } from '../../api/client.js';

const columns = [
  { key: 'FirstName', label: 'Nama' },
  { key: 'Email', label: 'Email' },
  { key: 'Hp', label: 'Wa' },
  { key: 'UserName', label: 'Username' },
  { key: 'Password', label: 'Password' },
];

// Padanan hris/user_app_ep.php
export default function UserEp() {
  const { data, loading, error, reload } = useFetch('/users/ep');
  const [form, setForm] = useState({ emp: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    setMsg('');
    try {
      await api.post('/users/ep', form);
      setMsg('Data berhasil disimpan');
      setForm({ emp: '', password: '' });
      reload();
    } catch (e2) {
      setErr(errMsg(e2));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page title="Data User E-Procurement">
      <Card title="Tambah User EP">
        <form onSubmit={submit}>
          <div>
            <label>Pilih Karyawan</label>
            <select value={form.emp} onChange={(e) => setForm({ ...form, emp: e.target.value })}>
              <option value="">Pilih Karyawan</option>
              {(data?.new_user || []).map((r) => (
                <option key={r.NONIK} value={r.NONIK}>[{r.Name}]-[{r.NONIK}]</option>
              ))}
            </select>
          </div>
          <div>
            <label>Password</label>
            <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          {err && <p className="err">{err}</p>}
          {msg && <p className="muted">{msg}</p>}
          <button disabled={busy}>{busy ? 'Menyimpan...' : 'Simpan'}</button>
        </form>
      </Card>
      <Card>
        {loading && <p className="muted">Memuat...</p>}
        {error && <p className="err">{error}</p>}
        <DataTable columns={columns} rows={data?.emp || []} />
      </Card>
    </Page>
  );
}
