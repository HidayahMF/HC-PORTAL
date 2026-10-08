import { useState } from 'react';
import { Page, Card, DataTable } from '../../components/ui.jsx';
import { useFetch } from '../../api/useFetch.js';
import api, { errMsg } from '../../api/client.js';

const ROLES = [
  ['1', 'Pembuat'],
  ['2', 'Section Head'],
  ['3', 'Group Head'],
  ['4', 'Dept Head'],
  ['5', 'Internal Control'],
];

const columns = [
  { key: 'FirstName', label: 'Nama' },
  { key: 'Approve', label: 'Approval Ke' },
  { key: 'Email', label: 'Email' },
  { key: 'Hp', label: 'Wa' },
  { key: 'UserName', label: 'Username' },
  { key: 'Password', label: 'Password' },
];

// Padanan hris/user_app_pr.php
export default function UserPr() {
  const { data, loading, error, reload } = useFetch('/users/pr');
  const [form, setForm] = useState({ emp: '', password: '', role: '1' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    setMsg('');
    try {
      await api.post('/users/pr', form);
      setMsg('Data berhasil disimpan');
      setForm({ emp: '', password: '', role: '1' });
      reload();
    } catch (e2) {
      setErr(errMsg(e2));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page title="Data User PR Online">
      <Card title="Tambah User PR">
        <form onSubmit={submit}>
          <div>
            <label>Pilih Karyawan</label>
            <select value={form.emp} onChange={(e) => setForm({ ...form, emp: e.target.value })}>
              <option value="">Pilih Karyawan</option>
              {(data?.emp || []).map((r) => <option key={r.NIP} value={r.NIP}>{r.Name}</option>)}
            </select>
          </div>
          <div>
            <label>Password</label>
            <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div>
            <label>Role</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          {err && <p className="err">{err}</p>}
          {msg && <p className="muted">{msg}</p>}
          <button disabled={busy}>{busy ? 'Menyimpan...' : 'Simpan'}</button>
        </form>
      </Card>
      <Card>
        {loading && <p className="muted">Memuat...</p>}
        {error && <p className="err">{error}</p>}
        <DataTable columns={columns} rows={data?.user_pr || []} />
      </Card>
    </Page>
  );
}
