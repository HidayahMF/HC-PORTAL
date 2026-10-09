import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Page, Card, DataTable } from '../../components/ui.jsx';
import Select from '../../components/fields/Select.jsx';
import DateField from '../../components/fields/DateField.jsx';
import { IcClose } from '../../app/icons.jsx';
import { useFetch } from '../../api/useFetch.js';
import api, { errMsg } from '../../api/client.js';

const pad = (n) => String(n).padStart(2, '0');
const ddmmyyyy = (v) => {
  if (!v) return '';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '' : `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
};
const EMPTY = { NIP: '', StartDate: '', EndDate: '', Remark: '' };
const t = (v) => String(v ?? '').trim();

function SuddenModal({ form, change, empOptions, err, busy, onSubmit, onClose }) {
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
            <h4 className="text-[15px] font-bold text-navy">Add Sudden Leave</h4>
            <button type="button" onClick={onClose} aria-label="Tutup" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-transparent text-mut transition-colors hover:bg-soft hover:text-navy"><IcClose width={16} height={16} /></button>
          </div>
          {err ? <p className="err mb-3">{err}</p> : null}
          <form className="grid grid-cols-1 gap-x-5 gap-y-3.5 sm:grid-cols-2" onSubmit={onSubmit}>
            <div className="sm:col-span-2">
              <label>NIP</label>
              <Select searchable value={form.NIP} options={empOptions} placeholder="-- Employee Nip --" onChange={(v) => change('NIP', v)} />
            </div>
            <div>
              <label>Start Date</label>
              <DateField value={form.StartDate} onChange={(v) => change('StartDate', v)} />
            </div>
            <div>
              <label>End Date</label>
              <DateField value={form.EndDate} onChange={(v) => change('EndDate', v)} />
            </div>
            <div className="sm:col-span-2">
              <label>Reason</label>
              <input value={form.Remark} onChange={(e) => change('Remark', e.target.value)} placeholder="Alasan cuti dadakan…" />
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <button disabled={busy}>{busy ? 'Menyimpan...' : 'Simpan'}</button>
              <button type="button" className="sec" onClick={onClose}>Batal</button>
            </div>
          </form>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default function SuddenLeave() {
  const { data, loading, error, reload } = useFetch('/leave/sudden');
  const { data: emps } = useFetch('/leave/employees');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState('');

  const empOptions = (emps || []).map((e) => [e.NIP, `${t(e.NIP)} | ${t(e.Name)}`]);
  const change = (k, value) => setForm((f) => {
    const next = { ...f, [k]: value };
    if (k === 'StartDate' && !f.EndDate) next.EndDate = value;
    return next;
  });

  const term = q.trim().toLowerCase();
  const rows = (data || []).filter((r) => !term
    || t(r.NIP).toLowerCase().includes(term)
    || t(r.Name).toLowerCase().includes(term));

  const openAdd = () => { setForm(EMPTY); setErr(''); setOpen(true); };
  const close = () => setOpen(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    try {
      await api.post('/leave/sudden', form);
      setOpen(false);
      reload();
    } catch (ex) {
      setErr(errMsg(ex));
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    { key: 'NIP', label: 'NIP', render: (r) => t(r.NIP) },
    { key: 'Name', label: 'Name', render: (r) => t(r.Name) },
    { key: 'StartDate', label: 'Start Date', render: (r) => ddmmyyyy(r.StartDate) },
    { key: 'EndDate', label: 'End Date', render: (r) => ddmmyyyy(r.EndDate) },
    { key: 'Days', label: 'Days' },
    { key: 'Reason', label: 'Reason', render: (r) => t(r.Reason) || '-' },
  ];

  return (
    <Page title="Cuti Mendadak" actions={<button className="btn" onClick={openAdd}>+ Add Sudden Leave</button>}>
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
                placeholder="Cari karyawan (nama atau NIP)…"
                aria-label="Cari karyawan"
                className="max-w-xs"
              />
              <span className="muted tnum">{rows.length} dari {(data || []).length}</span>
            </div>
            <DataTable columns={columns} rows={rows} empty="Belum ada cuti dadakan" emptyHint="Tambah lewat tombol di atas." />
          </>
        )}
      </Card>

      <AnimatePresence>
        {open ? (
          <SuddenModal
            form={form}
            change={change}
            empOptions={empOptions}
            err={err}
            busy={busy}
            onSubmit={submit}
            onClose={close}
          />
        ) : null}
      </AnimatePresence>
    </Page>
  );
}
