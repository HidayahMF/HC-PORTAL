import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Arrow } from '../primitives.jsx';

const LINKS = [
  { label: 'Kapabilitas', href: '#features' },
  { label: 'Struktur', href: '#people' },
  { label: 'Data', href: '#insight' },
];

export default function Navbar() {
  const [stuck, setStuck] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`nav ${stuck ? 'is-stuck' : ''}`}>
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <div className="flex h-16 items-center justify-between gap-6">
          <a href="#top" className="flex items-center gap-2.5">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-navy text-[12px] font-extrabold text-lime">HR</span>
            <span className="text-[15px] font-extrabold tracking-tight text-navy">HRIS</span>
          </a>

          <nav className="hidden items-center gap-8 md:flex" aria-label="Utama">
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} className="text-[13.5px] font-medium text-mut transition-colors hover:text-navy">
                {l.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <Link to="/hris/login" className="btn btn-primary btn-pill">
              Masuk <Arrow />
            </Link>
          </div>

          <button
            className="btn btn-ghost btn-pill md:hidden !p-2.5"
            aria-expanded={open}
            aria-controls="lp-mobile"
            aria-label={open ? 'Tutup menu' : 'Buka menu'}
            onClick={() => setOpen((v) => !v)}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              {open
                ? <path d="M4 4l10 10M14 4 4 14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                : <path d="M2.5 5h13M2.5 9h13M2.5 13h13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />}
            </svg>
          </button>
        </div>

        {open && (
          <div id="lp-mobile" className="border-t border-line py-3 md:hidden">
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="block px-1 py-2.5 text-sm font-medium text-navy">
                {l.label}
              </a>
            ))}
            <div className="mt-3">
              <Link to="/hris/login" className="btn btn-primary btn-pill w-full justify-center" onClick={() => setOpen(false)}>Masuk <Arrow /></Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
