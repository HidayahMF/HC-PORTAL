import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Eye, Plus, RotateCcw, Search, Trash2 } from 'lucide-react';
import { api } from '../api';
import { Page, Summary } from '../types';
import { ErrorMessage } from '../components/States';

const formatDate = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString('id-ID');

export function Dashboard() {
  const [summary, setSummary] = useState<Summary>();
  const [departments, setDepartments] = useState<string[]>([]);
  const [data, setData] = useState<Page>();
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [type, setType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [currentSummary, currentDepartments] = await Promise.all([api.summary(), api.departments()]);
      setSummary(currentSummary); setDepartments(currentDepartments);
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search); if (department) params.set('department', department); if (type) params.set('type', type); if (startDate) params.set('startDate', startDate); if (endDate) params.set('endDate', endDate);
      setData(await api.letters(params));
    } catch (e) { setError(e instanceof Error ? e.message : 'Gagal memuat data.'); } finally { setLoading(false); }
  };

  useEffect(() => { const timer = setTimeout(load, 250); return () => clearTimeout(timer); }, [page, search, department, type, startDate, endDate]);
  const reset = () => { setSearch(''); setDepartment(''); setType(''); setStartDate(''); setEndDate(''); setPage(1); };
  const remove = async (id: number, number: string) => { if (!window.confirm(`Hapus nomor surat ${number}? Data yang dihapus tidak dapat dikembalikan.`)) return; try { await api.deleteLetter(id); await load(); } catch (e) { setError(e instanceof Error ? e.message : 'Surat gagal dihapus.'); } };

  return <>
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-1 text-xs font-semibold uppercase tracking-widest text-bmc-red">Monitoring internal</p><h1 className="text-2xl font-semibold">Dashboard Nomor Surat</h1><p className="mt-1 text-sm text-bmc-muted">Monitoring dan registrasi nomor surat BMC</p></div><Link to="/letters/new" className="btn-primary"><Plus size={17}/>Buat Nomor Surat</Link></div>
    {error && <div className="mb-5"><ErrorMessage message={error}/></div>}
    <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{[['TOTAL SURAT', summary?.total], ['INTERNAL', summary?.internal], ['EXTERNAL', summary?.external], ['SURAT HARI INI', summary?.today]].map(([label, value], index) => <div className="border border-bmc-border bg-white p-4" key={label as string}><div className="mb-3 flex items-center justify-between"><span className="text-xs font-semibold tracking-wide text-bmc-muted">{label}</span><span className={`h-1.5 w-8 ${index === 0 || index === 3 ? 'bg-bmc-red' : 'bg-gray-300'}`}/></div><div className="text-2xl font-semibold">{value ?? <span className="text-gray-300">-</span>}</div></div>)}</div>
    <section className="border border-bmc-border bg-white"><div className="border-b border-bmc-border p-4"><div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_220px_160px_150px_150px_auto]"><div className="relative"><Search className="absolute left-3 top-3 text-bmc-muted" size={16}/><input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Cari nomor surat atau subject..." className="field pl-9"/></div><select value={department} onChange={e => { setDepartment(e.target.value); setPage(1); }} className="field"><option value="">Semua Departemen</option>{departments.map(item => <option key={item}>{item}</option>)}</select><select value={type} onChange={e => { setType(e.target.value); setPage(1); }} className="field"><option value="">Semua Jenis</option><option value="INTERNAL">Internal</option><option value="EXTERNAL">External</option></select><input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1); }} className="field"/><input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(1); }} className="field"/><button onClick={reset} className="btn-secondary"><RotateCcw size={15}/>Reset</button></div></div>
      <div className="overflow-x-auto">{loading ? <div className="space-y-3 p-5">{[1, 2, 3, 4].map(item => <div className="h-10 animate-pulse bg-gray-100" key={item}/>)}</div> : data?.items.length ? <table className="w-full min-w-[980px] text-left text-sm"><thead className="bg-gray-50 text-xs uppercase tracking-wide text-bmc-muted"><tr><th className="px-5 py-3 font-semibold">Nomor Surat</th><th className="px-5 py-3 font-semibold">Tanggal</th><th className="px-5 py-3 font-semibold">Departemen</th><th className="px-5 py-3 font-semibold">Jenis</th><th className="px-5 py-3 font-semibold">Subject</th><th className="px-5 py-3 font-semibold">Preview</th><th className="px-5 py-3 font-semibold">Aksi</th></tr></thead><tbody className="divide-y divide-bmc-border">{data.items.map(letter => <tr className="hover:bg-gray-50" key={letter.id}><td className="px-5 py-4 font-medium text-bmc-dark">{letter.letterNumber}</td><td className="px-5 py-4">{formatDate(letter.letterDate)}</td><td className="px-5 py-4">{letter.department}</td><td className="px-5 py-4">{letter.type === 'INTERNAL' ? 'Internal' : 'External'}</td><td className="max-w-[280px] truncate px-5 py-4">{letter.subject}</td><td className="px-5 py-4"><Link to={`/letters/${letter.id}`} className="inline-flex items-center gap-1.5 font-medium text-bmc-navy hover:text-bmc-red"><Eye size={15}/>Preview</Link></td><td className="px-5 py-4"><button onClick={() => remove(letter.id, letter.letterNumber)} className="inline-flex items-center gap-1 text-sm font-medium text-bmc-error hover:underline"><Trash2 size={15}/>Hapus</button></td></tr>)}</tbody></table> : <div className="p-10 text-center text-sm text-bmc-muted">Tidak ada data surat.</div>}</div>
      {data && <div className="flex items-center justify-between border-t border-bmc-border p-4 text-sm"><span className="text-bmc-muted">Halaman {data.page} dari {data.totalPages || 1}</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage(page - 1)} className="btn-secondary"><ChevronLeft size={16}/>Sebelumnya</button><button disabled={page >= data.totalPages} onClick={() => setPage(page + 1)} className="btn-secondary">Berikutnya<ChevronRight size={16}/></button></div></div>}
    </section>
  </>;
}
