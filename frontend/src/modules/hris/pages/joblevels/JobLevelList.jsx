import { useState } from 'react';
import { Page, Card, DataTable } from '../../components/ui.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import { useFetch } from '../../api/useFetch.js';
import api, { errMsg } from '../../api/client.js';

const EMPTY = { JobSeq: '', Joblevel: '' };

export default function JobLevelList() {
  const { data, loading, error, reload } = useFetch('/joblevels');
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [delBusy, setDelBusy] = useState(false);
  const [confirmRow, setConfirmRow] = useState(null);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      if (editId) await api.put(`/joblevels/${encodeURIComponent(editId)}`, form);
      else await api.post('/joblevels', form);
      setForm(EMPTY);
      setEditId(null);
      reload();
    } catch (ex) {
      setErr(errMsg(ex));
    } finally {
      setBusy(false);
    }
  };

  const edit = (r) => {
    setEditId(r.JobSeq);
    setForm({ JobSeq: r.JobSeq || '', Joblevel: r.Joblevel || '' });
  };

  const remove = (r) => setConfirmRow(r);
  const doRemove = async () => {
    if (!confirmRow) return;
    setDelBusy(true);
    try {
      await api.delete(`/joblevels/${encodeURIComponent(confirmRow.JobSeq)}`);
      setConfirmRow(null);
      reload();
    } catch (ex) {
      setErr(errMsg(ex));
      setConfirmRow(null);
    } finally {
      setDelBusy(false);
    }
  };

  const columns = [
    { key: 'JobSeq', label: 'Seq' },
    { key: 'Joblevel', label: 'Job Level' },
    {
      key: 'act',
      label: 'Action',
      render: (r) => (
        <div className="flex items-center gap-2">
          <button type="button" className="btn sm sec" onClick={() => edit(r)}>Edit</button>
          <button type="button" className="btn sm danger" onClick={() => remove(r)}>Delete</button>
        </div>
      ),
    },
  ];

  return (
    <Page title="Master Job Level">
      <Card title={editId ? `Edit Job Level ${editId}` : 'Tambah Job Level'}>
        <form className="row" onSubmit={submit}>
          <div>
            <label>Seq</label>
            <input value={form.JobSeq} onChange={set('JobSeq')} maxLength={6} required />
          </div>
          <div>
            <label>Job Level</label>
            <input value={form.Joblevel} onChange={set('Joblevel')} required />
          </div>
          <button disabled={busy}>{editId ? 'Update' : 'Save'}</button>
          {editId && (
            <button type="button" className="sec" onClick={() => { setEditId(null); setForm(EMPTY); }}>
              Cancel
            </button>
          )}
        </form>
        {err && <p className="err">{err}</p>}
      </Card>

      <Card>
        {loading ? (
          <div className="muted">Memuat...</div>
        ) : error ? (
          <p className="err">{error}</p>
        ) : (
          <DataTable columns={columns} rows={data} />
        )}
      </Card>

      <ConfirmDialog
        open={!!confirmRow}
        title="Hapus job level?"
        message={confirmRow ? `Job level "${confirmRow.Joblevel}" akan dihapus permanen.` : ''}
        confirmLabel="Hapus"
        busy={delBusy}
        onConfirm={doRemove}
        onCancel={() => setConfirmRow(null)}
      />
    </Page>
  );
}
