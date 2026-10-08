import { useState } from 'react';
import { Page, Card, DataTable } from '../../components/ui.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import { useFetch } from '../../api/useFetch.js';
import api, { errMsg } from '../../api/client.js';

const EMPTY = { DivisionName: '', Div_orders: '' };

export default function DivisionList() {
  const { data, loading, error, reload } = useFetch('/divisions');
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
      if (editId) await api.put(`/divisions/${editId}`, form);
      else await api.post('/divisions', form);
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
    setEditId(r.Id_Division);
    setForm({ DivisionName: r.DivisionName || '', Div_orders: r.Div_orders || '' });
  };

  const remove = (r) => setConfirmRow(r);
  const doRemove = async () => {
    if (!confirmRow) return;
    setDelBusy(true);
    try {
      await api.delete(`/divisions/${confirmRow.Id_Division}`);
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
    { key: 'Id_Division', label: 'ID' },
    { key: 'DivisionName', label: 'Division' },
    { key: 'Div_orders', label: 'Order' },
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
    <Page title="Master Division">
      <Card title={editId ? `Edit Division ${editId}` : 'Tambah Division'}>
        <form className="row" onSubmit={submit}>
          <div>
            <label>Division Name</label>
            <input value={form.DivisionName} onChange={set('DivisionName')} required />
          </div>
          <div>
            <label>Order</label>
            <input value={form.Div_orders} onChange={set('Div_orders')} maxLength={2} />
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
        title="Hapus division?"
        message={confirmRow ? `Division "${confirmRow.DivisionName}" akan dihapus permanen.` : ''}
        confirmLabel="Hapus"
        busy={delBusy}
        onConfirm={doRemove}
        onCancel={() => setConfirmRow(null)}
      />
    </Page>
  );
}
