import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Page, Card, DataTable } from '../../components/ui.jsx';
import Select from '../../components/fields/Select.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import { IcClose } from '../../app/icons.jsx';
import { useFetch } from '../../api/useFetch.js';
import api, { errMsg } from '../../api/client.js';

const EMPTY = { jb: '', lvl: '', div: '', cat: '', act: '1' };
const STATUS = [['1', 'Active'], ['0', 'InActive']];
const t = (v) => String(v ?? '').trim();

function JobtitleFormModal({ form, set, put, lvlOptions, divOptions, catOptions, editId, err, busy, onSubmit, onClose }) {
  const panelRef = useRef(null);
  return (
    <motion.div
      className="fixed inset-0 z-50 overflow-y-auto bg-navy/40 p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      onMouseDown={(e) => { if (!panelRef.current?.contains(e.target)) onClose(); }}
    >
      <div className="flex min-h-full items-center justify-center">
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, y: 14, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.97 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-[0_30px_60px_-30px_rgba(11,31,58,.6)]"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <h4 className="text-[15px] font-bold text-navy">{editId ? `Edit Jobtitle ${editId}` : 'Tambah Jobtitle'}</h4>
            <button type="button" onClick={onClose} aria-label="Tutup" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-transparent text-mut transition-colors hover:bg-soft hover:text-navy"><IcClose width={16} height={16} /></button>
          </div>
          {err ? <p className="err mb-3">{err}</p> : null}
          <form className="grid grid-cols-1 gap-x-5 gap-y-3.5 sm:grid-cols-2" onSubmit={onSubmit}>
            <div className="sm:col-span-2">
              <label>Jobtitle</label>
              <input value={form.jb} onChange={set('jb')} required />
            </div>
            <div>
              <label>Joblevel</label>
              <Select value={form.lvl} options={lvlOptions} placeholder="-- Pilih Joblevel --" onChange={put('lvl')} />
            </div>
            <div>
              <label>Status</label>
              <Select value={form.act} options={STATUS} onChange={put('act')} />
            </div>
            <div>
              <label>Divisi</label>
              <Select searchable value={form.div} options={divOptions} placeholder="-- Pilih Divisi --" onChange={put('div')} />
            </div>
            <div>
              <label>Category</label>
              <Select searchable value={form.cat} options={catOptions} placeholder="-- Pilih Category --" onChange={put('cat')} />
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <button disabled={busy}>{busy ? 'Menyimpan...' : editId ? 'Update' : 'Simpan'}</button>
              <button type="button" className="sec" onClick={onClose}>Batal</button>
            </div>
          </form>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default function JobtitleList() {
  const { data, loading, error, reload } = useFetch('/jobtitles');
  const { data: refs } = useFetch('/jobtitles/references');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [delBusy, setDelBusy] = useState(false);
  const [confirmRow, setConfirmRow] = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const put = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const lvlOptions = (refs?.lvl || []).map((k) => [k.Joblevel, k.Joblevel]);
  const divOptions = (refs?.div || []).map((k) => [`${k.Id_Division}|${t(k.DivisionName)}`, t(k.DivisionName)]);
  const catOptions = (refs?.cat || []).map((k) => [`${k.Id_Category}|${t(k.CategoryName)}`, t(k.CategoryName)]);

  const openAdd = () => { setForm(EMPTY); setEditId(null); setErr(''); setOpen(true); };
  const openEdit = (r) => {
    const divRef = (refs?.div || []).find((d) => t(d.DivisionName) === t(r.Division));
    const catRef = (refs?.cat || []).find((c) => t(c.CategoryName) === t(r.CategoryName));
    setEditId(r.Id_Jobtitle);
    setForm({
      jb: t(r.Jobtitle),
      lvl: t(r.Joblevel),
      div: divRef ? `${divRef.Id_Division}|${t(divRef.DivisionName)}` : `${t(r.Id_Division)}|${t(r.Division)}`,
      cat: catRef ? `${catRef.Id_Category}|${t(catRef.CategoryName)}` : `${t(r.Id_Category)}|${t(r.CategoryName)}`,
      act: String(r.is_Active) === '0' ? '0' : '1',
    });
    setErr('');
    setOpen(true);
  };
  const close = () => setOpen(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      if (editId) await api.put(`/jobtitles/${editId}`, form);
      else await api.post('/jobtitles', form);
      setOpen(false);
      reload();
    } catch (ex) {
      setErr(errMsg(ex));
    } finally {
      setBusy(false);
    }
  };

  const remove = (r) => setConfirmRow(r);
  const doRemove = async () => {
    if (!confirmRow) return;
    setDelBusy(true);
    try {
      await api.delete(`/jobtitles/${confirmRow.Id_Jobtitle}`);
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
    { key: 'Id_Jobtitle', label: 'Id' },
    { key: 'Jobtitle', label: 'Jobtitle' },
    { key: 'Joblevel', label: 'Joblevel' },
    { key: 'Division', label: 'Division' },
    { key: 'CategoryName', label: 'Category' },
    { key: 'stt', label: 'Active' },
    {
      key: 'act',
      label: 'Action',
      render: (r) => (
        <div className="flex items-center gap-2">
          <button type="button" className="btn sm sec" onClick={() => openEdit(r)}>Edit</button>
          <button type="button" className="btn sm danger" onClick={() => remove(r)}>Delete</button>
        </div>
      ),
    },
  ];

  return (
    <Page title="Master Job Title" actions={<button className="btn" onClick={openAdd}>+ Tambah Jobtitle</button>}>
      <Card>
        {loading ? (
          <div className="muted">Memuat...</div>
        ) : error ? (
          <p className="err">{error}</p>
        ) : (
          <>
            {err && !open ? <p className="err mb-3">{err}</p> : null}
            <DataTable columns={columns} rows={data} />
          </>
        )}
      </Card>

      <AnimatePresence>
        {open ? (
          <JobtitleFormModal
            key={editId || 'new'}
            form={form}
            set={set}
            put={put}
            lvlOptions={lvlOptions}
            divOptions={divOptions}
            catOptions={catOptions}
            editId={editId}
            err={err}
            busy={busy}
            onSubmit={submit}
            onClose={close}
          />
        ) : null}
      </AnimatePresence>

      <ConfirmDialog
        open={!!confirmRow}
        title="Hapus jobtitle?"
        message={confirmRow ? `Jobtitle "${t(confirmRow.Jobtitle)}" akan dihapus permanen.` : ''}
        confirmLabel="Hapus"
        busy={delBusy}
        onConfirm={doRemove}
        onCancel={() => setConfirmRow(null)}
      />
    </Page>
  );
}
