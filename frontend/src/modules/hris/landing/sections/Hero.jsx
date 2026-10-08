import { motion, useReducedMotion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Arrow, AvatarMark, RealData } from '../primitives.jsx';

const STATS = [
  ['Employees', 'Karyawan aktif'],
  ['Departments', 'Departemen'],
  ['Job Titles', 'Jabatan'],
  ['On Leave', 'Cuti hari ini'],
];

function Pop({ reduce, d, children, className = '' }) {
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.75, delay: d, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export default function Hero() {
  const reduce = useReducedMotion();
  const lines = [
    <>Your people,</>,
    <>in one <span className="text-lime-600">clear</span></>,
    <>picture.</>,
  ];

  return (
    <section id="top" className="relative overflow-hidden bg-white">
      <div className="blob h-[420px] w-[420px] -left-32 top-24 opacity-[0.22] blur-[2px]"
        style={reduce ? undefined : { animation: 'float 18s ease-in-out infinite' }} aria-hidden="true" />

      <div className="mx-auto max-w-[1200px] px-5 pb-16 pt-14 sm:px-8 sm:pb-24 sm:pt-20">
        <div className="grid12 items-center">
          {/* text 5/12 */}
          <div className="col-span-4 md:col-span-8 lg:col-span-5">
            <h1 className="text-[clamp(40px,6.4vw,74px)] font-extrabold tracking-[-0.045em] text-navy">
              {lines.map((t, i) => (
                <Pop key={i} reduce={reduce} d={0.05 + i * 0.08} className="block">
                  {t}
                </Pop>
              ))}
            </h1>

            <Pop reduce={reduce} d={0.32} className="mt-6">
              <p className="prose-lead text-[16px]">
                Portal kerja departemen Human Capital: mengelola data karyawan, struktur organisasi,
                jabatan, cuti, dan jenjang karier dari satu tempat, dengan data yang sama dengan
                sistem HRIS.
              </p>
            </Pop>

            <Pop reduce={reduce} d={0.42} className="mt-8">
              <div className="flex flex-wrap items-center gap-3">
                <Link to="/hris/login" className="btn btn-primary">
                  Masuk ke HRIS <Arrow />
                </Link>
                <a href="#features" className="btn btn-ghost btn-pill">Lihat kapabilitas</a>
              </div>
            </Pop>
          </div>

          {/* visual 7/12 */}
          <div className="col-span-4 md:col-span-8 lg:col-span-6 lg:col-start-7">
            <Pop reduce={reduce} d={0.2}>
              <div className="relative">
                <div className="blob h-56 w-72 -right-6 -top-6 opacity-30" aria-hidden="true" />

                <div className="surface surface-lift relative rounded-xl2 p-5 shadow-[0_40px_80px_-60px_rgba(11,31,58,0.6)]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {['HR', 'IT', 'FN', 'OP'].map((d, i) => (
                        <span key={d} style={{ marginLeft: i ? -12 : 0, zIndex: 10 - i }}>
                          <AvatarMark label={d} size={34} tone={i % 2 ? 'lime' : 'navy'} />
                        </span>
                      ))}
                      <span className="ml-3 text-[12.5px] font-medium text-mut">Departemen aktif</span>
                    </div>
                    <span className="rounded-lg border border-line px-2.5 py-1 text-[11.5px] font-semibold text-navy">hari ini</span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4">
                    {STATS.map(([v, k]) => (
                      <div key={k} className="bg-white p-3.5">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-mut">{v}</div>
                        <div className="mt-2"><RealData what={k} /></div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 grid grid-cols-5 gap-4">
                    <div className="col-span-3 rounded-xl border border-line p-3.5">
                      <div className="text-[12px] font-semibold text-navy">Kehadiran pekan ini</div>
                      <div className="mt-3 flex h-16 items-end gap-1.5" aria-hidden="true">
                        {[38, 54, 46, 62, 50, 68, 58].map((h, i) => (
                          <span key={i} className="w-full rounded-sm bg-lime" style={{ height: `${h}%`, opacity: 0.35 + i * 0.09 }} />
                        ))}
                      </div>
                      <div className="mt-2"><RealData what="tren kehadiran" /></div>
                    </div>

                    <div className="col-span-2 flex flex-col justify-between rounded-xl bg-navy p-3.5 text-white">
                      <div className="text-[12px] font-semibold text-white/80">Cuti menunggu</div>
                      <div className="mt-2"><RealData what="pengajuan cuti" /></div>
                      <div className="mt-3 text-[11.5px] text-white/60">Perlu persetujuan atasan</div>
                    </div>
                  </div>
                </div>

                {/* profile mini */}
                <div className="surface absolute -bottom-6 -left-4 hidden items-center gap-3 rounded-xl p-3 sm:flex">
                  <AvatarMark label="PE" size={36} />
                  <div>
                    <div className="text-[12.5px] font-semibold text-navy">Profil karyawan</div>
                    <div className="mt-1"><RealData what="nama, jabatan, unit" /></div>
                  </div>
                </div>
              </div>
            </Pop>
          </div>
        </div>
      </div>
    </section>
  );
}
