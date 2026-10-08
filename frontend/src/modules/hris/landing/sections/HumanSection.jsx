import { Reveal, AvatarMark } from '../primitives.jsx';

const ROLES = ['HR', 'IT', 'FN', 'OP', 'MK', 'LG', 'PD', 'QA'];
const PRINCIPLES = [
  ['Data tunggal', 'Satu sumber data karyawan untuk seluruh unit.'],
  ['Alur kerja HR', 'Proses administratif yang sama, bisa ditebak.'],
  ['Jejak perubahan', 'Riwayat data yang dapat ditelusuri kembali.'],
];

export default function HumanSection() {
  return (
    <section id="human" className="scroll-mt-20 bg-soft">
      <div className="mx-auto max-w-[1200px] px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid12 items-center gap-y-12">
          {/* visual: avatar mosaic, tanpa foto stok */}
          <div className="col-span-4 md:col-span-8 lg:col-span-6">
            <Reveal>
              <div className="relative">
                <div className="blob -left-6 -top-6 h-40 w-40 opacity-30" aria-hidden="true" />
                <div className="surface relative rounded-xl2 p-8">
                  <div className="grid grid-cols-4 gap-5">
                    {ROLES.map((r, i) => (
                      <div key={r} className="grid place-items-center">
                        <AvatarMark label={r} size={i % 3 === 0 ? 58 : 48} tone={i % 4 === 0 ? 'lime' : 'navy'} />
                      </div>
                    ))}
                  </div>
                  <p className="mt-7 text-center text-[12px] text-mut">
                    Setiap inisial mewakili sebuah peran, bukan orang tertentu.
                  </p>

                  {/* anotasi tulisan tangan, sengaja sangat sedikit */}
                  <div className="mt-6 flex items-center justify-center gap-3">
                    <span className="text-[15px] italic text-navy" style={{ transform: 'rotate(-2deg)' }}>
                      Great people build greater futures.
                    </span>
                    <svg width="72" height="12" viewBox="0 0 72 12" fill="none" aria-hidden="true">
                      <path d="M2 8c14-6 44-8 68-3" stroke="var(--color-lime-600)" strokeWidth="2.4" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>

          {/* teks + metrik */}
          <div className="col-span-4 md:col-span-8 lg:col-span-5 lg:col-start-8">
            <Reveal delay={0.08}>
              <h2 className="text-[clamp(30px,4.2vw,46px)] font-extrabold text-navy">
                Because HR software should still feel human.
              </h2>
              <p className="prose-lead mt-5">
                Di balik setiap baris data ada orang, tim, dan keputusan yang menyangkut mereka.
                HRIS menjaga konteks itu tetap terlihat bagi tim Human Capital.
              </p>

              <ul className="mt-9 space-y-5">
                {PRINCIPLES.map(([t, d]) => (
                  <li key={t} className="border-t border-line pt-4">
                    <div className="text-[14px] font-bold text-navy">{t}</div>
                    <p className="mt-1 text-[13px] text-mut">{d}</p>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
