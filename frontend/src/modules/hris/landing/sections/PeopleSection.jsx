import { useState } from 'react';
import { SectionLabel, Reveal, AvatarMark, RealData } from '../primitives.jsx';

const DEPTS = [
  { key: 'HR', name: 'People & HR', roles: ['Recruit', 'Payroll', 'Ops'] },
  { key: 'IT', name: 'Technology', roles: ['Platform', 'Data', 'Support'] },
  { key: 'FN', name: 'Finance', roles: ['Control', 'FP&A', 'Tax'] },
];

export default function PeopleSection() {
  const [active, setActive] = useState(null);

  return (
    <section id="people" className="scroll-mt-20 bg-white">
      <div className="mx-auto max-w-[1200px] px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid12 items-center gap-y-14">
          <div className="col-span-4 md:col-span-8 lg:col-span-5">
            <Reveal>
              <SectionLabel n="01">People</SectionLabel>
              <h2 className="mt-5 text-[clamp(30px,4.2vw,46px)] font-extrabold text-navy">
                Know who's building your company.
              </h2>
              <p className="prose-lead mt-5">
                Lihat struktur organisasi dan siapa ada di mana, tanpa membuka satu per satu berkas.
                Setiap unit menautkan karyawan, jabatan, dan atasan langsungnya.
              </p>
              <ul className="mt-7 space-y-3 text-[14px] text-navy">
                {['Profil karyawan dan riwayat jabatan', 'Struktur departemen dan atasan langsung', 'Pencarian orang lintas unit'].map((t) => (
                  <li key={t} className="flex items-start gap-3">
                    <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-lime-600" />
                    {t}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>

          <div className="col-span-4 md:col-span-8 lg:col-span-6 lg:col-start-7">
            <Reveal delay={0.08}>
              <div className="surface rounded-xl2 p-6 sm:p-8">
                {/* CEO */}
                <div className="mx-auto flex w-fit items-center gap-3 rounded-xl border border-line bg-white px-4 py-3">
                  <AvatarMark label="CEO" size={38} />
                  <div>
                    <div className="text-[13px] font-bold text-navy">Chief Executive</div>
                    <div className="text-[11.5px] text-mut">Puncak struktur</div>
                  </div>
                </div>

                <div className="mx-auto h-8 w-px bg-line" />

                <div className="relative">
                  <div className="absolute top-0 h-px bg-line" style={{ left: '16.666%', right: '16.666%' }} />
                  <div className="grid grid-cols-3">
                    {DEPTS.map((d, i) => (
                      <div
                        key={d.key}
                        className="flex flex-col items-center"
                        onMouseEnter={() => setActive(i)}
                        onMouseLeave={() => setActive(null)}
                      >
                        <span className={`h-8 w-px transition-colors ${active === i ? 'bg-lime-600' : 'bg-line'}`} />
                        <div
                          className={`w-full rounded-xl border bg-white px-3 py-3.5 text-center transition-all duration-300 ${
                            active === i ? 'border-lime-600 shadow-[0_18px_40px_-30px_rgba(11,31,58,0.8)] -translate-y-1' : 'border-line'
                          }`}
                        >
                          <div className="mx-auto w-fit"><AvatarMark label={d.key} tone={active === i ? 'lime' : 'navy'} size={36} /></div>
                          <div className="mt-2.5 text-[12.5px] font-bold text-navy">{d.name}</div>
                          <div className="mt-1 flex justify-center -space-x-1.5">
                            {d.roles.map((r) => (
                              <span key={r} title={r}><AvatarMark label={r} size={22} /></span>
                            ))}
                          </div>
                          <div className={`mt-2.5 transition-opacity ${active === i ? 'opacity-100' : 'opacity-0'}`}>
                            <RealData what={`jumlah anggota ${d.name}`} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="mt-5 text-center text-[11.5px] text-mut">
                  Avatar menandai peran dan unit, bukan orang tertentu.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
