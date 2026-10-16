import { useEffect, useRef, useState } from 'react';
import { Page, Card, DataTable } from '../../components/ui.jsx';
import { useFetch } from '../../api/useFetch.js';
import api, { errMsg } from '../../api/client.js';

const fmtDate = (v) => {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
};

const statusText = (v) => (v === '0' ? 'Aktif' : v === '1' ? 'Arsip' : '-');

const COLS = [
  { key: 'NIP', label: 'NIP' },
  { key: 'Name', label: 'Nama' },
  { key: 'Jobtitle', label: 'Jabatan' },
  { key: 'StartDate', label: 'Mulai', render: (r) => fmtDate(r.StartDate) || '-' },
  { key: 'EndDate', label: 'Selesai', render: (r) => fmtDate(r.EndDate) || '-' },
  { key: 'is_Archive', label: 'Status', render: (r) => statusText(r.is_Archive) },
];

export default function CareerPath() {
  const [f, setF] = useState({ q: '' });
  const [filter, setFilter] = useState(f);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [eerr, setEerr] = useState('');
  const doneTimer = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setFilter({ q: f.q.trim() }), 300);
    return () => clearTimeout(t);
  }, [f.q]);

  const term = filter.q.length >= 2 ? filter.q : '';
  const path = term ? `/statistics/level-three?q=${encodeURIComponent(term)}` : '/statistics/level-three';
  const { data, loading, error } = useFetch(path, [term]);
  const rows = data?.data || [];

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
              columns={COLS}
              rows={rows}
              empty="Belum ada riwayat jabatan"
              emptyHint="Pastikan NIP benar atau hubungi HRD untuk melengkapi data."
            />
          </>
        )}
      </Card>
    </Page>
  );
}
