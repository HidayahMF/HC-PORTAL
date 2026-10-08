import { SectionLabel, Reveal, RealData, AvatarMark } from '../primitives.jsx';

function Feature({ span, title, desc, children }) {
  const SPAN = { 4: 'lg:col-span-4', 5: 'lg:col-span-5', 7: 'lg:col-span-7', 12: 'lg:col-span-12' };
  return (
    <div className={`col-span-4 md:col-span-8 ${SPAN[span] || 'lg:col-span-4'}`}>
      <Reveal className="h-full">
        <div className="surface surface-lift h-full rounded-xl2 p-6">
          <h3 className="text-[16px] font-bold text-navy">{title}</h3>
          <p className="mt-2 text-[13.5px] leading-relaxed text-mut">{desc}</p>
          <div className="mt-5">{children}</div>
        </div>
      </Reveal>
    </div>
  );
}

/* Miniatur berbeda per modul, bukan ikon generik. */

function MiniPeople() {
  return (
    <div className="rounded-xl border border-line p-3">
      <div className="rounded-lg bg-soft px-3 py-2 text-[12px] text-mut">Cari orang, unit, atau jabatan</div>
      <ul className="mt-2">
        {['Peran A', 'Peran B', 'Peran C'].map((d, i) => (
          <li key={d} className={`flex items-center justify-between py-2.5 ${i ? 'border-t border-line' : ''}`}>
            <span className="flex items-center gap-2.5">
              <AvatarMark label={d.split(' ')[1] || d} size={24} />
              <span className="text-[12.5px] font-medium text-navy">{d}</span>
            </span>
            <RealData what="nama, unit, jabatan" />
          </li>
        ))}
      </ul>
    </div>
  );
}

function MiniLeave() {
  const days = ['S', 'S', 'R', 'K', 'J', 'S', 'M'];
  const state = ['in', 'in', 'leave', 'in', 'leave', 'off', 'off'];
  const cls = { in: 'bg-lime text-navy', leave: 'bg-navy text-white', off: 'bg-soft text-mut' };
  return (
    <div className="rounded-xl border border-line p-4">
      <div className="flex justify-between">
        {days.map((d, i) => (
          <span key={i} className={`grid h-8 w-8 place-items-center rounded-lg text-[11.5px] font-semibold ${cls[state[i]]}`}>{d}</span>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[11.5px] text-mut">Hijau: masuk, navy: cuti</span>
        <RealData what="saldo & pengajuan cuti" />
      </div>
    </div>
  );
}

function MiniJobTitle() {
  return (
    <div className="space-y-2.5 rounded-xl border border-line p-4">
      {[['Staff', 'L1'], ['Supervisor', 'L2'], ['Manager', 'L3']].map(([t, lvl]) => (
        <div key={t} className="flex items-center justify-between">
          <span className="text-[12.5px] font-medium text-navy">{t}</span>
          <span className="flex items-center gap-2">
            <span className="rounded-md bg-soft px-2 py-0.5 text-[11px] font-bold text-mut">{lvl}</span>
            <RealData what="pemegang jabatan" />
          </span>
        </div>
      ))}
    </div>
  );
}

function MiniDepartment() {
  return (
    <div className="rounded-xl border border-line p-4">
      <div className="mx-auto w-fit rounded-lg border border-line px-3 py-1.5 text-[11.5px] font-semibold text-navy">Departemen</div>
      <div className="mx-auto h-4 w-px bg-line" />
      <div className="grid grid-cols-2 gap-2">
        {['Sub A', 'Sub B', 'Sub C', 'Sub D'].map((k) => (
          <span key={k} className="rounded-lg border border-dashed border-line py-2 text-center text-[11px] font-semibold text-mut">{k}</span>
        ))}
      </div>
    </div>
  );
}

function MiniCareerPath() {
  return (
    <ol className="relative ml-1.5 space-y-4 border-l border-line pl-5">
      {['Posisi awal', 'Posisi saat ini', 'Posisi berikutnya'].map((t, i) => (
        <li key={t} className="relative">
          <span className={`absolute -left-[26px] top-1 h-3 w-3 rounded-full ${i === 1 ? 'bg-lime-600' : 'bg-navy/25'}`} />
          <div className="text-[12.5px] font-medium text-navy">{t}</div>
          <div className="mt-1"><RealData what="jabatan & tanggal mulai" /></div>
        </li>
      ))}
    </ol>
  );
}

const MODULES = [
  { span: 7, title: 'Manage People', desc: 'Data karyawan inti: identitas, kontak, unit, dan riwayat. Satu sumber, bisa dicari.', V: MiniPeople },
  { span: 5, title: 'Manage Leave', desc: 'Pengajuan, saldo, dan rekap cuti tanpa spreadsheet terpisah.', V: MiniLeave },
  { span: 4, title: 'Manage Job Title', desc: 'Daftar jabatan beserta level dan pemegangnya.', V: MiniJobTitle },
  { span: 4, title: 'Manage Department', desc: 'Susun departemen dan sub-departemen sesuai struktur nyata.', V: MiniDepartment },
  { span: 4, title: 'Manage Career Path', desc: 'Rekam jejak perpindahan jabatan tiap karyawan.', V: MiniCareerPath },
];

export default function FeatureShowcase() {
  return (
    <section id="features" className="scroll-mt-20 bg-white">
      <div className="mx-auto max-w-[1200px] px-5 py-20 sm:px-8 sm:py-28">
        <Reveal className="max-w-[60ch]">
          <SectionLabel n="03">Features</SectionLabel>
          <h2 className="mt-5 text-[clamp(30px,4.2vw,46px)] font-extrabold text-navy">
            Designed for real HR workflows.
          </h2>
          <p className="prose-lead mt-5">
            Lima area kerja inti yang benar-benar ada di dalam sistem: People, Leave, Job Title,
            Department, dan Career Path.
          </p>
        </Reveal>

        <div className="grid12 mt-12 gap-y-6">
          {MODULES.map(({ span, title, desc, V }) => (
            <Feature key={title} span={span} title={title} desc={desc}>
              <V />
            </Feature>
          ))}
        </div>
      </div>
    </section>
  );
}
