import { Link } from 'react-router-dom';
import { Arrow, Reveal } from '../primitives.jsx';

export default function CTA() {
  return (
    <section id="cta" className="relative scroll-mt-20 overflow-hidden bg-white">
      <div className="blob -right-24 top-10 h-72 w-72 opacity-25" aria-hidden="true" />
      <div className="mx-auto max-w-[1200px] px-5 py-24 text-center sm:px-8 sm:py-32">
        <Reveal>
          <h2 className="mx-auto max-w-[18ch] text-[clamp(32px,5vw,58px)] font-extrabold text-navy">
            Your people deserve a better system.
          </h2>
          <p className="prose-lead mx-auto mt-6 text-center">
            Masuk dengan akun HRIS Anda untuk mulai mengelola data karyawan, cuti, jabatan,
            departemen, dan jenjang karier.
          </p>
          <div className="mt-9 flex items-center justify-center">
            <Link to="/hris/login" className="btn btn-primary btn-pill px-7 py-3.5">
              Masuk ke HRIS <Arrow />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
