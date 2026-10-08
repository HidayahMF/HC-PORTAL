import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { useAuth } from '../auth/AuthContext.jsx';
import { errMsg } from '../api/client.js';
import { Arrow } from '../landing/primitives.jsx';

const MODULES = ['People', 'Leave', 'Job Title', 'Department', 'Career Path'];

function Rise({ reduce, d = 0, children, className = '' }) {
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: d, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const reduce = useReducedMotion();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(username, password);
      navigate(location.state?.from?.pathname || '/hris/dashboard', { replace: true });
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="lp min-h-screen bg-white">
      <div className="flex min-h-screen">
        {/* panel editorial navy (desktop) */}
        <aside className="relative hidden w-[52%] shrink-0 flex-col justify-between overflow-hidden bg-navy px-12 py-12 lg:flex">
          <div
            className="blob -bottom-24 -left-20 h-80 w-80 opacity-20"
            style={reduce ? undefined : { animation: 'float 22s ease-in-out infinite' }}
            aria-hidden="true"
          />

          <div className="relative flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-lime text-[13px] font-extrabold text-navy">HR</span>
            <div>
              <div className="text-[15px] font-extrabold text-white">HRIS</div>
              <div className="text-[11px] text-white/50">Human Resources Management System</div>
            </div>
          </div>

          <div className="relative max-w-[34ch]">
            <Rise reduce={reduce}>
              <h1 className="text-[clamp(34px,4.4vw,54px)] font-extrabold leading-[1.05] tracking-[-0.04em] text-white">
                Your people,<br />in one <span className="text-lime">clear</span> picture.
              </h1>
            </Rise>
            <Rise reduce={reduce} d={0.1}>
              <p className="mt-6 text-[15px] leading-relaxed text-white/60">
                Portal kerja departemen Human Capital: data karyawan, struktur organisasi, jabatan,
                cuti, dan jenjang karier dalam satu tempat.
              </p>
            </Rise>
            <Rise reduce={reduce} d={0.18}>
              <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2">
                {MODULES.map((m) => (
                  <li key={m} className="text-[12.5px] font-medium text-white/45">{m}</li>
                ))}
              </ul>
            </Rise>
          </div>

          <div className="relative text-[12px] font-medium text-white/40">People · Process · Progress</div>
        </aside>

        {/* form */}
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-line px-6 py-4 lg:hidden">
            <div className="flex items-center gap-2.5">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-navy text-[12px] font-extrabold text-lime">HR</span>
              <span className="text-[14px] font-extrabold text-navy">HRIS</span>
            </div>
            <Link to="/hris" className="text-[13px] font-medium text-mut hover:text-navy">Beranda</Link>
          </div>

          <div className="flex flex-1 items-center justify-center px-6 py-14 sm:px-10">
            <Rise reduce={reduce} d={0.12} className="w-full max-w-[380px]">
              <form onSubmit={onSubmit} noValidate>
                <h2 className="text-[26px] font-extrabold tracking-[-0.03em] text-navy">Masuk</h2>
                <p className="mt-2 text-[13.5px] text-mut">Masuk dengan NIP dan tanggal lahir Anda.</p>

                <div className="mt-8">
                  <label htmlFor="username" className="text-[12px] font-semibold text-navy">NIP</label>
                  <input
                    id="username"
                    name="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoFocus
                    autoComplete="username"
                    placeholder="mis. 5605"
                    aria-invalid={!!error}
                    className="mt-1.5 w-full rounded-lg border border-line bg-white px-3.5 py-3 text-[14px] text-navy placeholder:text-mut/70"
                  />
                </div>

                <div className="mt-5">
                  <label htmlFor="password" className="text-[12px] font-semibold text-navy">Tanggal lahir</label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="ddmmyy"
                    aria-invalid={!!error}
                    aria-describedby="bd-hint"
                    className="mt-1.5 w-full rounded-lg border border-line bg-white px-3.5 py-3 text-[14px] text-navy placeholder:text-mut/70"
                  />
                  <p id="bd-hint" className="mt-1.5 text-[11.5px] text-mut">Format ddmmyy, contoh 051207.</p>
                </div>

                {error && (
                  <p role="alert" className="mt-4 rounded-lg bg-[#fdeaea] px-3.5 py-2.5 text-[13px] font-semibold text-[#b91c1c]">
                    {error}
                  </p>
                )}

                <button type="submit" disabled={busy} className="btn btn-primary mt-7 w-full justify-center py-3.5">
                  {busy ? 'Memproses…' : (<>Masuk <Arrow /></>)}
                </button>
              </form>

              <div className="mt-8 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-line pt-5 text-[12.5px]">
                <Link to="/hris" className="font-medium text-mut hover:text-navy">Kembali ke beranda</Link>
                <span className="text-mut/70">Kendala akun: hubungi admin HRIS</span>
              </div>
            </Rise>
          </div>
        </main>
      </div>
    </div>
  );
}
