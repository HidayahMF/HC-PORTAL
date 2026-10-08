import { SectionLabel, Reveal, RealData } from '../primitives.jsx';

const DASH = '5 6';

function Frame({ title, className = '', children }) {
  return (
    <div className={`surface rounded-xl2 p-5 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[13.5px] font-bold text-navy">{title}</h3>
        <RealData />
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function Line() {
  return (
    <svg viewBox="0 0 240 96" className="h-24 w-full" role="img" aria-label="Kerangka grafik garis, menunggu data">
      {[0, 24, 48, 72, 96].map((y) => <line key={y} x1="0" y1={y} x2="240" y2={y} stroke="var(--color-line)" strokeWidth="1" />)}
      <path d="M4 78 C40 70 60 40 92 44 S150 30 178 36 220 20 236 26" fill="none" stroke="var(--color-navy)" strokeWidth="2" strokeDasharray={DASH} strokeLinecap="round" />
    </svg>
  );
}

function Bars({ vertical = false }) {
  const vals = [64, 44, 78, 56, 68];
  if (vertical) {
    return (
      <div className="flex h-24 items-end gap-2" aria-hidden="true">
        {vals.map((h, i) => <span key={i} className="w-full rounded-sm border border-dashed border-navy/40" style={{ height: `${h}%`, background: i === 2 ? 'var(--color-lime-soft)' : 'transparent' }} />)}
      </div>
    );
  }
  return (
    <div className="space-y-3" aria-hidden="true">
      {vals.map((w, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-soft">
            <span className="block h-full rounded-full border border-dashed border-navy/40" style={{ width: `${w}%`, background: i === 0 ? 'var(--color-lime-soft)' : 'transparent' }} />
          </span>
        </div>
      ))}
    </div>
  );
}

function Stacked() {
  return (
    <div className="flex h-24 items-end gap-3" aria-hidden="true">
      {[70, 50, 84].map((h, i) => (
        <span key={i} className="w-full rounded-t-md border border-dashed border-navy/40" style={{ height: `${h}%` }}>
          <span className="block w-full rounded-t-md border-b border-dashed border-navy/30" style={{ height: '34%', background: 'var(--color-lime-soft)' }} />
        </span>
      ))}
    </div>
  );
}

export default function AnalyticsSection() {
  return (
    <section id="insight" className="scroll-mt-20 bg-white">
      <div className="mx-auto max-w-[1200px] px-5 py-20 sm:px-8 sm:py-28">
        <Reveal className="max-w-[60ch]">
          <SectionLabel n="05">Insight</SectionLabel>
          <h2 className="mt-5 text-[clamp(30px,4.2vw,46px)] font-extrabold text-navy">
            Turn people data into clear decisions.
          </h2>
          <p className="prose-lead mt-5">
            Grafik di bawah adalah kerangka tampilan. Angka akan terisi dari sumber data HRIS,
            jadi tidak ada satu pun nilai contoh yang ditampilkan.
          </p>
        </Reveal>

        <div className="grid12 mt-12 gap-6">
          <div className="col-span-4 md:col-span-8 lg:col-span-7">
            <Reveal><Frame title="Bagaimana pertumbuhan headcount dari bulan ke bulan?"><Line /></Frame></Reveal>
          </div>
          <div className="col-span-4 md:col-span-8 lg:col-span-5">
            <Reveal delay={0.06}><Frame title="Bagaimana sebaran karyawan per departemen?"><Bars /></Frame></Reveal>
          </div>
          <div className="col-span-4 md:col-span-4 lg:col-span-4">
            <Reveal><Frame title="Bagaimana tren kehadiran?"><Line /></Frame></Reveal>
          </div>
          <div className="col-span-4 md:col-span-4 lg:col-span-4">
            <Reveal delay={0.05}><Frame title="Bagaimana pertumbuhan karyawan?"><Bars vertical /></Frame></Reveal>
          </div>
          <div className="col-span-4 md:col-span-8 lg:col-span-4">
            <Reveal delay={0.1}><Frame title="Bagaimana penggunaan cuti?"><Stacked /></Frame></Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
