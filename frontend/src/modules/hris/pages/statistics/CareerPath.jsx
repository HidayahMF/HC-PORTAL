import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Page, Card, DataTable } from '../../components/ui.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import { useFetch } from '../../api/useFetch.js';
import api, { errMsg } from '../../api/client.js';

const fmtDate = (v) => {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  if (d.getFullYear() === 1900 && d.getMonth() === 0 && d.getDate() === 1) return '';
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
};

const statusText = (v) => (v === '0' ? 'Aktif' : v === '1' ? 'Arsip' : '-');

const getCols = (changeArchive, remove, busy) => [
  { key: 'NIP', label: 'NIP' },
  { key: 'Name', label: 'Nama' },
  { key: 'Jobtitle', label: 'Jabatan' },
  { key: 'StartDate', label: 'Mulai', render: (r) => fmtDate(r.StartDate) || '-' },
  { key: 'EndDate', label: 'Selesai', render: (r) => fmtDate(r.EndDate) || '-' },
  { key: 'is_Archive', label: 'Status', render: (r) => statusText(r.is_Archive) },
  { key: '_action', label: 'Aksi', className: 'whitespace-nowrap', render: (r) => (
    <div className="flex flex-nowrap items-center gap-1.5 whitespace-nowrap">
      <button
        type="button"
        className={`btn sm whitespace-nowrap ${r.is_Archive === '0' ? 'danger' : 'accent'}`}
        disabled={busy}
        onClick={() => changeArchive(r)}
      >
        {r.is_Archive === '0' ? 'Nonaktifkan' : 'Aktifkan kembali'}
      </button>
      <button type="button" className="btn sm danger" disabled={busy} onClick={() => remove(r)}>
        Hapus
      </button>
    </div>
  ) },
];

export default function CareerPath() {
  const [searchParams] = useSearchParams();
  const initialQ = searchParams.get('q') || '';
  const [f, setF] = useState({ q: initialQ });
  const [filter, setFilter] = useState({ q: initialQ });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [eerr, setEerr] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);
  const doneTimer = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setFilter({ q: f.q.trim() }), 300);
    return () => clearTimeout(t);
  }, [f.q]);

  const term = filter.q.length >= 2 ? filter.q : '';
  const path = term ? `/statistics/level-three?q=${encodeURIComponent(term)}` : '/statistics/level-three';
  const { data, loading, error, reload } = useFetch(path, [term]);
  const rows = data?.data || [];
  const changeArchive = (row) => setConfirm({
    id: row.Id_CareerPath,
    archive: row.is_Archive === '0',
    name: row.Name,
  });
  const remove = (row) => setConfirm({
    id: row.Id_CareerPath,
    action: 'delete',
    name: row.Name,
    jobtitle: row.Jobtitle,
  });
  const confirmAction = async () => {
    if (!confirm) return;
    setActionBusy(true);
    setEerr('');
    try {
      if (confirm.action === 'delete') {
        await api.delete(`/statistics/level-three/${confirm.id}`);
      } else {
        const action = confirm.archive ? 'archive' : 'unarchive';
        await api.patch(`/statistics/level-three/${confirm.id}/${action}`);
      }
      setConfirm(null);
      reload();
    } catch (e) {
      setEerr(errMsg(e));
    } finally {
      setActionBusy(false);
    }
  };

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const exportXlsx = async () => {
    setBusy(true);
    setEerr('');
    if (doneTimer.current) clearTimeout(doneTimer.current);
    setDone(false);
    try {
      const res = await api.get(
        '/statistics/level-three/export' + (term ? `?q=${encodeURIComponent(term)}` : ''),
        { responseType: 'blob' },
      );
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `careerpath-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setEerr(errMsg(e));
    } finally {
      setBusy(false);
      setDone(true);
      doneTimer.current = setTimeout(() => setDone(false), 1600);
    }
  };

  const exportLabel = busy ? 'Menyiapkan...' : done ? 'Tersimpan' : 'Export';

  return (
    <Page title="CareerPath" actions={<button type="button" onClick={exportXlsx} disabled={busy || rows.length === 0} aria-live="polite" aria-label={exportLabel} className={`btn active:scale-[0.97] transition-transform ${done ? 'accent' : ''}`}>{busy ? (<svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="9" opacity=".25" /><path d="M21 12a9 9 0 0 0-9-9" /></svg>) : done ? (<svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m4 12 5 5L20 6" /></svg>) : null}{exportLabel}</button>}>
      <Card title="Filter">
        <form className="row" onSubmit={(e) => { e.preventDefault(); setFilter({ q: f.q.trim() }); }}>
          <div>
            <label>Kata Kunci</label>
            <input value={f.q} onChange={set('q')} placeholder="Cari berdasarkan NIP atau Nama…" />
            <p className="muted">Ketik untuk mencari. Minimal 2 karakter. Kosongkan untuk menampilkan semua data.</p>
          </div>
        </form>
      </Card>
      <Card>
        {eerr && <p className="err">{eerr}</p>}
        {loading && <p className="muted">Memuat...</p>}
        {error && <p className="err">{error}</p>}
        {!loading && !error && (
          <>
            <p className="muted">Total {rows.length} data.</p>
            <DataTable
               columns={getCols(changeArchive, remove, actionBusy)}
              rows={rows}
              empty="Belum ada riwayat jabatan"
              emptyHint="Pastikan NIP benar atau hubungi HRD untuk melengkapi data."
            />
          </>
        )}
      </Card>
      <ConfirmDialog
        open={!!confirm}
        title={confirm?.action === 'delete' ? 'Hapus career path?' : confirm?.archive ? 'Nonaktifkan career path?' : 'Aktifkan kembali career path?'}
        message={confirm ? (confirm.action === 'delete'
          ? `${confirm.jobtitle || 'Career path'} milik ${confirm.name || 'karyawan ini'} akan dihapus permanen.`
          : `${confirm.name || 'Data ini'} akan ${confirm.archive ? 'dipindahkan ke arsip' : 'diaktifkan kembali'}.`) : ''}
        confirmLabel={confirm?.action === 'delete' ? 'Hapus' : confirm?.archive ? 'Nonaktifkan' : 'Aktifkan kembali'}
        busy={actionBusy}
        onConfirm={confirmAction}
        onCancel={() => { if (!actionBusy) setConfirm(null); }}
      />
    </Page>
  );
}
