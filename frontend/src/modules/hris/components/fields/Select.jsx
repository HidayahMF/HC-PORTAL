import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { IcChevron } from '../../app/icons.jsx';

/**
 * Select custom (bukan <select> HTML).
 * searchable=true -> bisa diketik untuk memfilter (dipakai Departemen).
 * options: array [value, label].
 */
export default function Select({ value, onChange, options = [], placeholder = '-- Pilih --', searchable = false, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(-1);
  const ref = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  useEffect(() => { if (!open) { setQ(''); setActive(-1); } }, [open]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!searchable || !s) return options;
    return options.filter(([, l]) => String(l).toLowerCase().includes(s));
  }, [options, q, searchable]);

  const selected = options.find(([v]) => String(v) === String(value));

  const pick = (v) => { onChange(String(v)); setOpen(false); };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') { setOpen(false); return; }
    if (!open) { if (e.key === 'ArrowDown' || e.key === 'Enter') { e.preventDefault(); setOpen(true); } return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (filtered[active]) pick(filtered[active][0]); }
  };

  return (
    <div className="relative break-normal" ref={ref}>
      <button
        type="button"
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-line bg-white px-3 py-2.5 text-left text-[13.5px] text-navy transition-colors hover:border-navy/30 disabled:opacity-60"
      >
        <span className={`truncate ${selected ? '' : 'text-mut/70'}`}>{selected ? selected[1] : placeholder}</span>
        <IcChevron width={15} height={15} className={`shrink-0 text-mut transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-0 right-0 top-full z-40 mt-1 overflow-hidden rounded-xl border border-line bg-white shadow-[0_24px_50px_-30px_rgba(11,31,58,.5)]"
          >
            {searchable && (
              <div className="border-b border-line p-2">
                <input
                  autoFocus
                  value={q}
                  onChange={(e) => { setQ(e.target.value); setActive(-1); }}
                  onKeyDown={onKeyDown}
                  placeholder="Ketik untuk mencari…"
                  className="w-full rounded-md border border-line bg-soft px-2.5 py-1.5 text-[13px] text-navy placeholder:text-mut/70"
                />
              </div>
            )}
            <ul ref={listRef} role="listbox" className="max-h-60 overflow-y-auto py-1">
              {filtered.length === 0 && <li className="px-3 py-2.5 text-[12.5px] text-mut">Tidak ada yang cocok.</li>}
              {filtered.map(([v, l], i) => {
                const isSel = String(v) === String(value);
                return (
                  <li key={v}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSel}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => pick(v)}
                      className={`flex w-full items-center justify-between gap-2 bg-transparent px-3 py-2 text-left text-[13px] transition-colors duration-100 hover:bg-lime-soft ${i === active ? 'bg-lime-soft' : ''} ${isSel ? 'font-semibold text-navy' : 'text-navy'}`}
                    >
                      <span className="truncate">{l}</span>
                      {isSel && <span className="text-lime-600">•</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
