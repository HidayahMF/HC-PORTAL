import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client.js';
import { IcSearch } from '../app/icons.jsx';

const initials = (s = '') => s.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'HR';

/** Autocomplete karyawan: ketik nama/NIP -> pilih -> buka Employee Information. */
export default function EmployeeSearch({ autoFocus = false }) {
  const navigate = useNavigate();
  const boxRef = useRef(null);
  const seq = useRef(0);
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setItems([]); setLoading(false); return undefined; }
    setLoading(true);
    const id = ++seq.current;
    const t = setTimeout(() => {
      api.get('/employees/search', { params: { q: term } })
        .then((res) => { if (id === seq.current) setItems(res.data?.data || []); })
        .catch(() => { if (id === seq.current) setItems([]); })
        .finally(() => { if (id === seq.current) setLoading(false); });
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const onDown = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const choose = (nip) => { setOpen(false); setQ(''); setItems([]); navigate('/hris/employees/' + nip); };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') { setOpen(false); return; }
    if (!open || items.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (items[active]) choose(items[active].NIP); }
  };

  const show = open && q.trim().length >= 2;

  return (
    <div className="relative w-full max-w-[520px]" ref={boxRef}>
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mut"><IcSearch width={16} height={16} /></span>
      <input
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(-1); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        autoFocus={autoFocus}
        placeholder="Cari karyawan berdasarkan nama atau NIP…"
        aria-label="Cari karyawan"
        role="combobox"
        aria-expanded={show}
        aria-controls="emp-search-list"
        aria-autocomplete="list"
        className="w-full rounded-lg border border-line bg-white py-2.5 pl-9 pr-3 text-[13.5px] text-navy placeholder:text-mut/70"
      />
      {show && (
        <div id="emp-search-list" role="listbox"
          className="absolute left-0 right-0 top-full z-40 mt-2 max-h-[320px] overflow-y-auto rounded-xl border border-line bg-white py-1 shadow-[0_24px_50px_-30px_rgba(11,31,58,.5)]">
          {loading && items.length === 0 && <div className="px-3.5 py-3 text-[13px] text-mut">Mencari…</div>}
          {!loading && items.length === 0 && <div className="px-3.5 py-3 text-[13px] text-mut">Tidak ada karyawan yang cocok.</div>}
          {items.map((it, i) => (
            <button key={it.NIP} type="button" role="option" aria-selected={i === active}
              onMouseEnter={() => setActive(i)} onClick={() => choose(it.NIP)}
              className={`flex w-full items-center gap-3 bg-transparent px-3.5 py-2.5 text-left text-[13px] transition-colors duration-150 hover:bg-lime-soft ${i === active ? 'bg-lime-soft' : ''}`}>
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-navy text-[11px] font-bold text-lime">{initials(it.Name)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-navy">{it.Name}</span>
                <span className="block truncate text-[11.5px] text-mut">{it.Department}</span>
              </span>
              <span className="shrink-0 text-[11.5px] text-mut tnum">{it.NIP}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
