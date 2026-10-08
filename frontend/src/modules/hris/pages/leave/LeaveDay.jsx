import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Page, Card, DataTable } from '../../components/ui.jsx';
import Select from '../../components/fields/Select.jsx';
import DateField from '../../components/fields/DateField.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import { IcClose } from '../../app/icons.jsx';
import { useFetch } from '../../api/useFetch.js';
import api, { errMsg } from '../../api/client.js';

const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const ddmmyyyy = (v) => {
  if (!v) return '';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '' : `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
};
const endFromBeg = (beg, span) => {
  if (!beg) return '';
  const d = new Date(beg + 'T00:00:00');
  d.setFullYear(d.getFullYear() + span);
  d.setDate(d.getDate() - 1);
  return iso(d);
};

const TYPES = [['1', 'Tahunan'], ['2', 'Besar']];
const EMPTY = { NIP: '', LeaveType: '1', BegPeriod: '', EndPeriod: '', LeaveDays: 9 };
const t = (v) => String(v ?? '').trim();

function LeaveDayModal({ form, change, empOptions, err, busy, editing, onSubmit, onClose }) {
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
            <h4 className="text-[15px] font-bold text-navy">{editing ? 'Edit Leave Day' : 'Add Leave Day'}</h4>
            <button type="button" onClick={onClose} aria-label="Tutup" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-transparent text-mut transition-colors hover:bg-soft hover:text-navy"><IcClose width={16} height={16} /></button>
          </div>
          {err ? <p className="err mb-3">{err}</p> : null}
          <form className="grid grid-cols-1 gap-x-5 gap-y-3.5 sm:grid-cols-2" onSubmit={onSubmit}>
            <div className="sm:col-span-2">
              <label>NIP</label>
              <Select searchable value={form.NIP} options={empOptions} placeholder="-- Employee Nip --" onChange={(v) => change('NIP', v)} />
            </div>
            <div>
              <label>Tipe Cuti</label>
              <Select value={form.LeaveType} options={TYPES} onChange={(v) => change('LeaveType', v)} />
            </div>
            <div>
              <label>Leave Days</label>
              <input type="number" min="0" value={form.LeaveDays} onChange={(e) => change('LeaveDays', e.target.value)} />
            </div>
            <div>
              <label>Beg Period</label>
              <DateField value={form.BegPeriod} onChange={(v) => change('BegPeriod', v)} />
            </div>
            <div>
              <label>End Period</label>
              <DateField value={form.EndPeriod} onChange={(v) => change('EndPeriod', v)} />
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

export default function LeaveDay() {
  const { data, loading, error, reload } = useFetch('/leave/balance');
  const { data: emps } = useFetch('/leave/employees');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [orig, setOrig] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [delBusy, setDelBusy] = useState(false);
  const [confirmRow, setConfirmRow] = useState(null);
  const [q, setQ] = useState('');

  const empOptions = (emps || []).map((e) => [e.NIP, `${t(e.NIP)} | ${t(e.Name)}`]);
  const isoFrom = (v) => { const d = new Date(v); return Number.isNaN(d.getTime()) ? '' : iso(d); };

  const change = (k, value) => setForm((f) => {
    const next = { ...f, [k]: value };
    if (k === 'LeaveType') next.LeaveDays = value === '2' ? 30 : 9;
    if (k === 'LeaveType' || k === 'BegPeriod') {
      next.EndPeriod = endFromBeg(next.BegPeriod, next.LeaveType === '2' ? 6 : 1);
    }
    return next;
  });

  const term = q.trim().toLowerCase();
  const rows = (data || []).filter((r) => !term
    || t(r.NIP).toLowerCase().includes(term)
    || t(r.Name).toLowerCase().includes(term));

  const openAdd = () => { setForm(EMPTY); setOrig(null); setErr(''); setOpen(true); };
  const openEdit = (r) => {
    setOrig({ NIP: t(r.NIP), LeaveType: '1', BegPeriod: isoFrom(r.BegPeriod) });
    setForm({
      NIP: t(r.NIP),
      LeaveType: '1',
      BegPeriod: isoFrom(r.BegPeriod),
      EndPeriod: isoFrom(r.EndPeriod),
      LeaveDays: r.SaldoAwal ?? 9,
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
      if (orig) {
        await api.put('/leave/day', {
          NIP: form.NIP,
          LeaveType: form.LeaveType,
          BegPeriod: orig.BegPeriod,
          NewBegPeriod: form.BegPeriod,
          EndPeriod: form.EndPeriod,
          LeaveDays: form.LeaveDays,
        });
      } else {
        await api.post('/leave/day', form);
      }
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
      await api.delete('/leave/day', { params: { NIP: t(confirmRow.NIP), LeaveType: '1', BegPeriod: isoFrom(confirmRow.BegPeriod) } });
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
    { key: 'NIP', label: 'NIP', render: (r) => t(r.NIP) },
    { key: 'Name', label: 'Name', render: (r) => t(r.Name) },
    {
      key: 'periode',
      label: 'Periode Cuti Tahunan',
      render: (r) => `${ddmmyyyy(r.BegPeriod)} s/d ${ddmmyyyy(r.EndPeriod)}`,
    },
    { key: 'SaldoAwal', label: 'Saldo Awal Tahunan' },
    { key: 'Transaksi', label: 'Transaksi Tahunan' },
    { key: 'Sisa', label: 'Sisa Saldo Tahunan' },
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
    <Page title="Employee Leave Balance" actions={<button className="btn" onClick={openAdd}>+ Add Leave Day</button>}>
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
            <DataTable columns={columns} rows={rows} empty="Tidak ada data saldo cuti" emptyHint="Ubah kata kunci pencarian." />
          </>
        )}
      </Card>

      <AnimatePresence>
        {open ? (
          <LeaveDayModal
            key={orig ? `edit-${orig.NIP}-${orig.BegPeriod}` : 'new'}
            form={form}
            change={change}
            empOptions={empOptions}
            err={err}
            busy={busy}
            editing={!!orig}
            onSubmit={submit}
            onClose={close}
          />
        ) : null}
      </AnimatePresence>

      <ConfirmDialog
        open={!!confirmRow}
        title="Hapus data cuti?"
        message={confirmRow ? `Data cuti tahunan ${t(confirmRow.Name)} (${t(confirmRow.NIP)}) akan dihapus permanen.` : ''}
        confirmLabel="Hapus"
        busy={delBusy}
        onConfirm={doRemove}
        onCancel={() => setConfirmRow(null)}
      />
    </Page>
  );
}
