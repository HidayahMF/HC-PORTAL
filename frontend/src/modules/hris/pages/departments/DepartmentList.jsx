import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Page, Card, DataTable } from '../../components/ui.jsx';
import Select from '../../components/fields/Select.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import { IcClose } from '../../app/icons.jsx';
import { useFetch } from '../../api/useFetch.js';
import api, { errMsg } from '../../api/client.js';

const EMPTY = {
  DepartID: '',
  NamaDepartemen: '',
  TipeDepartemen: '',
  Level: '',
  DepartemenInduk: '',
  KodeCostCenter: '',
};

const LEVELS = [
  'Board Of Director',
  'Divisi',
  'Departemen',
  'Sub Departemen',
  'Sub Sub Departemen',
  'Sub Sub Sub Departemen',
].map((v) => [v, v]);

const t = (v) => String(v ?? '').trim();
const isInactive = (r) => t(r.TidakAktif) === 'Y';

function DepartmentFormModal({ form, set, put, parentOptions, editId, err, busy, onSubmit, onClose }) {
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
            <h4 className="text-[15px] font-bold text-navy">{editId ? `Edit Departemen ${editId}` : 'Tambah Departemen'}</h4>
            <button type="button" onClick={onClose} aria-label="Tutup" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-transparent text-mut transition-colors hover:bg-soft hover:text-navy"><IcClose width={16} height={16} /></button>
          </div>
          {err ? <p className="err mb-3">{err}</p> : null}
          <form className="grid grid-cols-1 gap-x-5 gap-y-3.5 sm:grid-cols-2" onSubmit={onSubmit}>
            <div>
              <label>Depart ID</label>
              <input value={form.DepartID} onChange={set('DepartID')} disabled={!!editId} required />
            </div>
            <div>
              <label>Nama Departemen</label>
              <input value={form.NamaDepartemen} onChange={set('NamaDepartemen')} />
            </div>
            <div>
              <label>Tipe Departemen</label>
              <input value={form.TipeDepartemen} onChange={set('TipeDepartemen')} />
            </div>
            <div>
              <label>Cost Center</label>
              <input value={form.KodeCostCenter} onChange={set('KodeCostCenter')} />
            </div>
            <div>
              <label>Level</label>
              <Select value={form.Level} options={LEVELS} placeholder="-- Pilih Level --" onChange={put('Level')} />
            </div>
            <div>
              <label>Departemen Induk</label>
              <Select searchable value={form.DepartemenInduk} options={parentOptions} placeholder="-- Pilih Departemen Induk --" onChange={put('DepartemenInduk')} />
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

const ORG_CSS = `
.orgt, .orgt ul { display: flex; justify-content: center; }
.orgt ul { padding-top: 22px; position: relative; }
.orgt li { list-style: none; position: relative; padding: 22px 8px 0; text-align: center; }
.orgt li::before, .orgt li::after { content: ''; position: absolute; top: 0; right: 50%; width: 50%; height: 22px; border-top: 2px solid #dfe6dc; }
.orgt li::after { right: auto; left: 50%; border-left: 2px solid #dfe6dc; }
.orgt li:only-child::after, .orgt li:only-child::before { display: none; }
.orgt li:only-child { padding-top: 0; }
.orgt li:first-child::before, .orgt li:last-child::after { border: 0 none; }
.orgt li:last-child::before { border-right: 2px solid #dfe6dc; border-radius: 0 8px 0 0; }
.orgt li:first-child::after { border-radius: 8px 0 0 0; }
.orgt ul ul::before, .orgt > li > ul::before { content: ''; position: absolute; top: 0; left: 50%; border-left: 2px solid #dfe6dc; width: 0; height: 22px; }
.orgt-merge-top { position: relative; display: inline-flex; gap: 28px; padding-bottom: 16px; }
.orgt-mcell { position: relative; }
.orgt-mcell::after { content: ''; position: absolute; left: 50%; top: 100%; width: 2px; height: 16px; margin-left: -1px; background: #dfe6dc; }
.orgt-merge-top::after { content: ''; position: absolute; left: 67px; right: 67px; bottom: 0; height: 2px; background: #dfe6dc; }
`;

function OrgCard({ node }) {
  return (
    <div className="inline-flex h-[54px] w-[134px] flex-col items-center justify-center rounded-xl border border-line bg-white px-2 py-1.5 text-center shadow-[0_1px_0_rgba(11,31,58,.05)]">
      <span className="line-clamp-2 text-[11.5px] font-bold leading-tight text-navy">{node.NamaDepartemen}</span>
    </div>
  );
}

function OrgNode({ node, childrenMap }) {
  const kids = childrenMap[node.DepartID] || [];
  return (
    <li>
      <OrgCard node={node} />
      {kids.length > 0 ? (
        <ul>
          {kids.map((k) => <OrgNode key={k.DepartID} node={k} childrenMap={childrenMap} />)}
        </ul>
      ) : null}
    </li>
  );
}

function StructureModal({ items, onClose }) {
  const panelRef = useRef(null);
  const allById = new Map(items.map((i) => [i.DepartID, i]));
  const childrenAll = {};
  for (const i of items) {
    const p = t(i.DepartemenInduk);
    if (p && p !== i.DepartID && allById.has(p)) (childrenAll[p] ||= []).push(i);
  }
  const keepIds = new Set();
  const stack = ['0110', '0120'];
  while (stack.length) {
    const id = stack.pop();
    if (keepIds.has(id) || !allById.has(id)) continue;
    keepIds.add(id);
    for (const c of childrenAll[id] || []) stack.push(c.DepartID);
  }
  const kept = items.filter((i) => keepIds.has(i.DepartID));
  const childrenMap = {};
  for (const i of kept) {
    const p = t(i.DepartemenInduk);
    if (p && p !== i.DepartID && keepIds.has(p)) (childrenMap[p] ||= []).push(i);
  }
  const roots = kept.filter((i) => {
    const p = t(i.DepartemenInduk);
    return !p || p === i.DepartID || !keepIds.has(p);
  });
  const pair = roots.slice(0, 2);
  const pairKids = pair.flatMap((r) => childrenMap[r.DepartID] || []);

  const wrapRef = useRef(null);
  const innerRef = useRef(null);
  const [fit, setFit] = useState({ scale: 1, height: 0, offsetX: 0 });

  useEffect(() => {
    const measure = () => {
      const w = wrapRef.current?.clientWidth || 0;
      const iw = innerRef.current?.offsetWidth || 0;
      const ih = innerRef.current?.offsetHeight || 0;
      if (!w || !iw) return;
      const scale = Math.min(1, w / iw);
      setFit({ scale, height: ih * scale, offsetX: Math.max(0, (w - iw * scale) / 2) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (wrapRef.current) ro.observe(wrapRef.current);
    if (innerRef.current) ro.observe(innerRef.current);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, [items]);

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
          className="w-full max-w-5xl rounded-2xl bg-white p-5 shadow-[0_30px_60px_-30px_rgba(11,31,58,.6)]"
        >
          <style>{ORG_CSS}</style>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h4 className="text-[15px] font-bold text-navy">Struktur Organisasi</h4>
              <p className="text-[12px] text-mut">Board Of Director · Departemen</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Tutup" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-transparent text-mut transition-colors hover:bg-soft hover:text-navy"><IcClose width={16} height={16} /></button>
          </div>
          {items.length === 0 ? (
            <div className="empty"><b>Tidak ada data struktur</b>Belum ada departemen pada level tersebut.</div>
          ) : (
            <div ref={wrapRef} className="overflow-hidden" style={{ height: fit.height || undefined }}>
              <div
                ref={innerRef}
                className="w-max"
                style={{ transform: `scale(${fit.scale})`, transformOrigin: 'top left', marginLeft: fit.offsetX }}
              >
                <ul className="orgt">
                  <li>
                    <div className="orgt-merge-top">
                      {pair.map((r) => (
                        <div key={r.DepartID} className="orgt-mcell"><OrgCard node={r} /></div>
                      ))}
                    </div>
                    {pairKids.length > 0 ? (
                      <ul>
                        {pairKids.map((k) => <OrgNode key={k.DepartID} node={k} childrenMap={childrenMap} />)}
                      </ul>
                    ) : null}
                  </li>
                </ul>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

export default function DepartmentList() {
  const { data, loading, error, reload } = useFetch('/departments');
  const { data: parents } = useFetch('/departments/parents');
  const [open, setOpen] = useState(false);
  const [structureOpen, setStructureOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [delBusy, setDelBusy] = useState(false);
  const [confirmRow, setConfirmRow] = useState(null);
  const [q, setQ] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const put = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const parentOptions = (parents || []).map((p) => [p.DepartID, `${p.DepartID} | ${p.NamaDepartemen}`]);

  const term = q.trim().toLowerCase();
  const rows = (data || []).filter((r) => !term || [
    'DepartID', 'NamaDepartemen', 'TipeDepartemen', 'LevelDepartemen', 'DepartemenInduk', 'KodeCostCenter',
  ].some((k) => t(r[k]).toLowerCase().includes(term)));

  const openAdd = () => { setForm(EMPTY); setEditId(null); setErr(''); setOpen(true); };
  const openEdit = (r) => {
    setEditId(t(r.DepartID));
    setForm({
      DepartID: t(r.DepartID),
      NamaDepartemen: t(r.NamaDepartemen),
      TipeDepartemen: t(r.TipeDepartemen),
      Level: t(r.LevelDepartemen),
      DepartemenInduk: t(r.DepartemenInduk),
      KodeCostCenter: t(r.KodeCostCenter),
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
      if (editId) await api.put(`/departments/${editId}`, form);
      else await api.post('/departments', form);
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
      await api.delete(`/departments/${t(confirmRow.DepartID)}`);
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
    { key: 'DepartID', label: 'ID', render: (r) => t(r.DepartID) },
    { key: 'NamaDepartemen', label: 'Nama', render: (r) => t(r.NamaDepartemen) },
    { key: 'TipeDepartemen', label: 'Tipe', render: (r) => t(r.TipeDepartemen) },
    { key: 'LevelDepartemen', label: 'Level', render: (r) => t(r.LevelDepartemen) },
    { key: 'DepartemenInduk', label: 'Dept Induk', render: (r) => t(r.DepartemenInduk) },
    { key: 'KodeCostCenter', label: 'Cost Center', render: (r) => t(r.KodeCostCenter) },
    {
      key: 'stt',
      label: 'Status',
      render: (r) => (
        <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${isInactive(r) ? 'bg-soft text-mut' : 'bg-lime-soft text-navy'}`}>
          {isInactive(r) ? 'Inactive' : 'Active'}
        </span>
      ),
    },
    {
      key: 'act',
      label: 'Action',
      render: (r) => (
        <div className="flex items-center gap-2">
          <button type="button" className="btn sm sec" onClick={() => openEdit(r)}>Edit</button>
          <button type="button" className="btn sm danger" disabled={isInactive(r)} onClick={() => remove(r)}>Delete</button>
        </div>
      ),
    },
  ];

  return (
    <Page title="Master Department" actions={
      <>
        <button className="btn sec" onClick={() => setStructureOpen(true)}>Lihat Struktur</button>
        <button className="btn" onClick={openAdd}>+ Tambah Departemen</button>
      </>
    }>
      <Card>
        {loading ? (
          <div className="muted">Memuat...</div>
        ) : error ? (
          <p className="err">{error}</p>
        ) : (
          <>
            {err && !open ? <p className="err mb-3">{err}</p> : null}
            <div className="mb-3 flex items-center justify-between gap-3">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Cari departemen (nama, ID, level…)"
                aria-label="Cari departemen"
                className="max-w-xs"
              />
              <span className="muted tnum">{rows.length} dari {(data || []).length}</span>
            </div>
            <DataTable columns={columns} rows={rows} empty="Tidak ada departemen yang cocok" emptyHint="Ubah kata kunci pencarian." />
          </>
        )}
      </Card>

      <AnimatePresence>
        {open ? (
          <DepartmentFormModal
            key={editId || 'new'}
            form={form}
            set={set}
            put={put}
            parentOptions={parentOptions}
            editId={editId}
            err={err}
            busy={busy}
            onSubmit={submit}
            onClose={close}
          />
        ) : null}
      </AnimatePresence>
      <AnimatePresence>
        {structureOpen ? (
          <StructureModal key="structure" items={parents || []} onClose={() => setStructureOpen(false)} />
        ) : null}
      </AnimatePresence>

      <ConfirmDialog
        open={!!confirmRow}
        title="Nonaktifkan departemen?"
        message={confirmRow ? `Departemen ${t(confirmRow.NamaDepartemen)} (${t(confirmRow.DepartID)}) akan ditandai inactive. Data tidak dihapus.` : ''}
        confirmLabel="Nonaktifkan"
        busy={delBusy}
        onConfirm={doRemove}
        onCancel={() => setConfirmRow(null)}
      />
    </Page>
  );
}
