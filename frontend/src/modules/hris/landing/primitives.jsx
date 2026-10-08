import { motion, useReducedMotion } from 'motion/react';

/** Scroll reveal. REDUCE-MOTION dihormati; hanya satu gerak (fade + rise). */
export function Reveal({ children, delay = 0, y = 18, as = 'div', className = '' }) {
  const reduce = useReducedMotion();
  const Comp = motion[as] || motion.div;
  if (reduce) return <Comp className={className}>{children}</Comp>;
  return (
    <Comp
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-70px' }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </Comp>
  );
}

/** Label seksi editorial. Brief meminta format "01 / PEOPLE". */
export function SectionLabel({ n, children }) {
  return (
    <div className="label">
      <b className="tnum">{n}</b> / {children}
    </div>
  );
}

/** Penanda jujur untuk nilai yang belum punya sumber nyata. */
export function RealData({ what }) {
  return (
    <span className="reald" title={what ? `Menunggu data: ${what}` : 'Menunggu data nyata'}>
      [REAL DATA]
    </span>
  );
}

/** Ikon panah authored (bukan impor library), dipakai hanya pada CTA utama. */
export function Arrow({ className = 'arw' }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2.5 8h11M9 3.5 13.5 8 9 12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Avatar inisial untuk PERAN/DEPARTEMEN, bukan orang fiktif. */
export function AvatarMark({ label = '', tone = 'navy', size = 40 }) {
  const initials = label.trim().slice(0, 2).toUpperCase() || '--';
  const bg = tone === 'lime' ? 'var(--color-lime)' : 'var(--color-navy)';
  const fg = tone === 'lime' ? 'var(--color-navy)' : '#fff';
  return (
    <span
      className="grid place-items-center rounded-full font-bold shrink-0"
      style={{ width: size, height: size, background: bg, color: fg, fontSize: size * 0.34 }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}
