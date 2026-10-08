import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { IcCalendar } from '../../app/icons.jsx';

const pad = (n) => String(n).padStart(2, '0');
const isoOf = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const fmt = (v) => (v ? new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(v + 'T00:00:00')) : '');
const DOW = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

/** Date picker custom (bukan <input type="date">). Nilai ISO yyyy-mm-dd. */
export default function DateField({ value, onChange, placeholder = 'Pilih tanggal' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const [view, setView] = useState(() => {
    const d = value ? new Date(value + 'T00:00:00') : new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  useEffect(() => {
    if (!value) return;
    const d = new Date(value + 'T00:00:00');
    if (!Number.isNaN(d.getTime())) setView({ y: d.getFullYear(), m: d.getMonth() });
  }, [value]);

  useEffect(() => {
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, []);

  const { y, m } = view;
  const lead = (new Date(y, m, 1).getDay() + 6) % 7;
  const days = new Date(y, m + 1, 0).getDate();
  const todayIso = isoOf(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  const monthLabel = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date(y, m, 1));

  const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const shift = (delta) => { const d = new Date(y, m + delta, 1); setView({ y: d.getFullYear(), m: d.getMonth() }); };
  const navBtn = 'grid h-7 w-7 place-items-center rounded-md bg-transparent text-mut hover:bg-lime-soft hover:text-navy';

  return (
    <div className="relative break-normal" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2.5 text-left text-[13.5px] text-navy transition-colors hover:border-lime-600 hover:bg-lime-soft/50 ${open ? 'border-lime-600 ring-2 ring-lime/30' : 'border-line'}`}
      >
        <span className={value ? '' : 'text-mut/70'}>{value ? fmt(value) : placeholder}</span>
        <IcCalendar width={16} height={16} className="shrink-0 text-mut" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-0 z-40 mt-1 w-[288px] rounded-xl border border-line bg-white p-3 shadow-[0_24px_50px_-30px_rgba(11,31,58,.5)]"
          >
            <div className="mb-2 flex items-center justify-between">
              <button type="button" className={navBtn} onClick={() => shift(-12)} aria-label="Tahun sebelumnya">«</button>
              <button type="button" className={navBtn} onClick={() => shift(-1)} aria-label="Bulan sebelumnya">‹</button>
              <span className="text-[13px] font-semibold capitalize text-navy">{monthLabel}</span>
              <button type="button" className={navBtn} onClick={() => shift(1)} aria-label="Bulan berikutnya">›</button>
              <button type="button" className={navBtn} onClick={() => shift(12)} aria-label="Tahun berikutnya">»</button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
              {DOW.map((d) => <span key={d} className="py-1 text-[10.5px] font-semibold uppercase tracking-wide text-mut">{d}</span>)}
              {cells.map((d, i) => {
                if (d === null) return <span key={`e${i}`} />;
                const ci = isoOf(y, m, d);
                const isSel = value === ci;
                const isToday = ci === todayIso;
                return (
                  <button
                    key={ci}
                    type="button"
                    onClick={() => { onChange(ci); setOpen(false); }}
                    className={`grid h-8 w-8 place-items-center rounded-md text-[12.5px] transition-colors ${
                      isSel ? 'bg-lime font-semibold text-navy' : 'bg-transparent text-navy hover:bg-lime-soft'
                    } ${isToday && !isSel ? 'ring-1 ring-lime-600' : ''}`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>

            <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
              <button type="button" onClick={() => { onChange(todayIso); setOpen(false); }} className="rounded-md bg-transparent px-2 py-1 text-[12px] font-medium text-navy hover:bg-lime-soft">Hari ini</button>
              <button type="button" onClick={() => { onChange(''); setOpen(false); }} className="rounded-md bg-transparent px-2 py-1 text-[12px] font-medium text-mut hover:bg-lime-soft">Hapus</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
