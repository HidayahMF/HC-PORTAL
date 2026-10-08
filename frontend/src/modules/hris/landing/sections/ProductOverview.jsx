import { SectionLabel, Reveal, RealData, AvatarMark } from '../primitives.jsx';

const MENU = ['Dashboard', 'People', 'Leave', 'Job Title', 'Department', 'Career Path', 'Attendance', 'Reports'];
const DEPTS = ['People & HR', 'Technology', 'Finance', 'Operations'];

export default function ProductOverview() {
  return (
    <section id="product" className="scroll-mt-20 bg-soft">
      <div className="mx-auto max-w-[1200px] px-5 py-20 sm:px-8 sm:py-28">
        <Reveal className="max-w-[62ch]">
          <SectionLabel n="02">One system</SectionLabel>
          <h2 className="mt-5 text-[clamp(30px,4.2vw,46px)] font-extrabold text-navy">
            Everything HR. Nothing unnecessary.
          </h2>
          <p className="prose-lead mt-5">
            Satu ruang kerja untuk administrasi karyawan sehari-hari. Menu yang sama, alur yang bisa
            ditebak, tanpa tab yang tidak terpakai.
          </p>
        </Reveal>

        <Reveal delay={0.1} className="mt-12">
          <div className="mx-auto max-w-[1040px]">
            <div className="surface overflow-hidden rounded-xl2 shadow-[0_50px_90px_-70px_rgba(11,31,58,0.7)]">
              <div className="grid grid-cols-12">
                {/* side nav */}
                <aside className="col-span-4 hidden border-r border-line bg-white p-4 sm:block sm:col-span-3 md:col-span-3">
                  <div className="mb-4 flex items-center gap-2">
                    <span className="grid h-6 w-6 place-items-center rounded-md bg-navy text-[10px] font-extrabold text-lime">HR</span>
                    <span className="text-[12.5px] font-bold text-navy">HRIS</span>
                  </div>
                  <nav className="space-y-0.5">
                    {MENU.map((m, i) => (
                      <span key={m} className={`flex items-center justify-between rounded-lg px-3 py-2 text-[12.5px] font-medium ${i === 0 ? 'bg-lime text-navy font-bold' : 'text-mut'}`}>
                        {m}
                      </span>
                    ))}
                  </nav>
                </aside>

                {/* main */}
                <div className="col-span-12 bg-white p-5 sm:col-span-9 sm:p-7">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <h3 className="text-[17px] font-bold text-navy">Ringkasan tim</h3>
                      <p className="text-[12.5px] text-mut">Kondisi terkini dari data HRIS.</p>
                    </div>
                    <span className="rounded-lg border border-line px-3 py-1.5 text-[12px] font-semibold text-navy">Bulan ini</span>
                  </div>

                  <div className="mt-6 grid gap-4 sm:grid-cols-3">
                    {['Headcount', 'Kehadiran', 'Cuti aktif'].map((k) => (
                      <div key={k} className="rounded-xl border border-line p-4">
                        <div className="text-[11.5px] font-semibold uppercase tracking-wide text-mut">{k}</div>
                        <div className="mt-3"><RealData what={k} /></div>
                        <div className="mt-4 h-1.5 rounded-full bg-soft"><span className="block h-full w-2/3 rounded-full bg-lime" /></div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 rounded-xl border border-line">
                    <div className="flex items-center justify-between border-b border-line px-4 py-3">
                      <span className="text-[13px] font-bold text-navy">Departemen</span>
                      <span className="text-[12px] text-mut">Anggota</span>
                    </div>
                    <ul>
                      {DEPTS.map((d) => (
                        <li key={d} className="flex items-center justify-between px-4 py-3 text-[13px] [&+&]:border-t [&+&]:border-line">
                          <span className="flex items-center gap-3">
                            <AvatarMark label={d.slice(0, 2)} size={26} tone="navy" />
                            <span className="font-medium text-navy">{d}</span>
                          </span>
                          <RealData what={`anggota ${d}`} />
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
