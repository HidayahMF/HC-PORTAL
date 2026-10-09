import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { useAuth } from '../auth/AuthContext.jsx';
import { useFetch } from '../api/useFetch.js';
import { Donut, VBars, MiniBars, Legend } from '../components/charts.jsx';
import { useCountUp } from '../app/useCountUp.js';
import { IcChevron, IcUser, IcCap, IcClock, IcUpcoming, IcUsers } from '../app/icons.jsx';
import { Page } from '../components/ui.jsx';

const dateID = () => new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
const greet = () => { const h = new Date().getHours(); return h < 11 ? 'GOOD MORNING,' : h < 15 ? 'GOOD AFTERNOON,' : h < 19 ? 'GOOD EVENING,' : 'GOOD NIGHT,'; };
const initials = (s = '') => s.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'HR';
const fmtDate = (v) => (v ? new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(v)) : '-');
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

function Reveal({ children, delay = 0, className = '' }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div className={className} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }} transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}

function Card({ children, className = '' }) {
  return <section className={`rounded-2xl border border-line bg-white ${className}`}>{children}</section>;
}

function CardHead({ icon: Icon, title, to }) {
  return (
    <div className="flex items-center gap-2.5 px-5 pt-4">
      {Icon && <Icon width={17} height={17} className="text-navy" />}
      <h2 className="text-[14.5px] font-bold text-navy">{title}</h2>
      {to && (
        <Link to={to} className="ml-auto text-mut hover:text-navy" aria-label={`Buka ${title}`}>
          <IcChevron width={16} height={16} />
        </Link>
      )}
    </div>
  );
}

function AvatarCluster() {
  return (
    <span className="flex -space-x-2">
      {[0, 1, 2].map((i) => (
        <span key={i} className="grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-soft text-mut">
          <IcUser width={13} height={13} />
        </span>
      ))}
    </span>
  );
}

function Ring({ value, size = 46, stroke = 5 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E3E9DF" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#B7F34A" strokeWidth={stroke}
        strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, value / 100))} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="53%" textAnchor="middle" dominantBaseline="middle" fontSize="10.5" fontWeight="700" fill="#0b1f3a">{value}%</text>
    </svg>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data, loading, error } = useFetch('/dashboard/summary');

  const t = data?.totals || {};
  const total = useCountUp(t.employees || 0);
  const male = useCountUp(t.male || 0);
  const female = useCountUp(t.female || 0);
  const retired = useCountUp(t.retired || 0);
  const kids = t.employees || 0;

  const jobLevel = data?.jobLevel || [];
  const age = data?.age || [];
  const education = data?.education || [];
  const workingTime = data?.workingTime || [];
  const recent = data?.recent || [];

  if (error) {
    return <Card className="p-6"><p className="text-[14px] font-semibold text-navy">Ringkasan tidak dapat dimuat.</p><p className="mt-1 text-[13px] text-mut">{error}</p></Card>;
  }

  return (
    <Page title="Dasbor">
    <div className="mx-auto max-w-[1320px] space-y-5">
      {/* HERO */}
      <Reveal>
        <Card className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-12 lg:p-8">
          <div className="lg:col-span-7">
            <p className="text-[11.5px] font-bold uppercase tracking-[0.16em] text-mut">{greet()}</p>
            <h1 className="mt-1 text-[clamp(28px,3.6vw,44px)] font-extrabold tracking-[-0.035em] text-navy">{(user?.name || user?.sub || '').trim()}</h1>
            <p className="mt-3 max-w-[56ch] text-[14px] text-mut">
              Berikut adalah ringkasan data karyawan pada sistem HRIS.<br />Semoga hari ini produktif!
            </p>
          </div>
          <div className="relative lg:col-span-5">
            <div className="relative overflow-hidden rounded-2xl bg-soft p-6">
              <svg className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 text-lime" viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">
                <path d="M58 4c20 0 36 16 36 36S78 76 58 76 22 60 22 40 38 4 58 4z" opacity="0.5" />
              </svg>
              <p className="relative text-[17px] font-semibold italic leading-snug text-navy" style={{ transform: 'rotate(-2deg)' }}>
                Great<br />People<br />Build<br />Greater<br />Futures.
              </p>
              <svg className="relative mt-2 h-2 w-24 text-lime" viewBox="0 0 96 8" fill="none" aria-hidden="true">
                <path d="M2 6c18-4 58-5 92-2" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
              </svg>
            </div>
            <div className="mt-4 rounded-2xl border border-line bg-white p-4">
              <div className="flex items-center gap-2 text-[13px] font-bold text-navy"><IcUpcoming width={16} height={16} /> {dateID()}</div>
              <div className="mt-3 rounded-lg bg-soft px-3 py-4 text-center text-[12.5px] text-mut">Belum ada agenda terjadwal.</div>
            </div>
          </div>
        </Card>
      </Reveal>

      {/* KPI */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <Reveal>
          <Card className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[26px] font-extrabold leading-none text-navy tnum">{total}</div>
                <div className="mt-1 text-[12.5px] font-semibold text-navy">Total Karyawan</div>
                <div className="mt-0.5 text-[11.5px] text-mut">Jumlah karyawan aktif</div>
              </div>
              <div className="w-28"><MiniBars data={age.length ? age : [{ label: 'a', total: 1 }]} /></div>
            </div>
          </Card>
        </Reveal>
        <Reveal delay={0.05}>
          <Card className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[26px] font-extrabold leading-none text-navy tnum">{male}</div>
                <div className="mt-1 text-[12.5px] font-semibold text-navy">Laki-laki</div>
                <div className="mt-0.5 text-[11.5px] text-mut">Pegawai laki-laki</div>
              </div>
              <div className="flex items-center gap-3"><AvatarCluster /><Ring value={pct(t.male || 0, kids)} /></div>
            </div>
          </Card>
        </Reveal>
        <Reveal delay={0.1}>
          <Card className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[26px] font-extrabold leading-none text-navy tnum">{female}</div>
                <div className="mt-1 text-[12.5px] font-semibold text-navy">Perempuan</div>
                <div className="mt-0.5 text-[11.5px] text-mut">Pegawai perempuan</div>
              </div>
              <div className="flex items-center gap-3"><AvatarCluster /><Ring value={pct(t.female || 0, kids)} /></div>
            </div>
          </Card>
        </Reveal>
        <Reveal delay={0.15}>
          <Card className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[26px] font-extrabold leading-none text-navy tnum">{retired}</div>
                <div className="mt-1 text-[12.5px] font-semibold text-navy">Pensiun {new Date().getFullYear()}</div>
                <div className="mt-0.5 text-[11.5px] text-mut">Pegawai pensiun tahun ini</div>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {Array.from({ length: Math.min(retired, 20) }).map((_, i) => <span key={i} className="h-2 w-2 rounded-full bg-lime" />)}
              </div>
            </div>
          </Card>
        </Reveal>
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <Reveal>
          <Card className="h-full pb-4">
            <CardHead icon={IcUsers} title="Job Level" />
            <div className="px-3 pt-1"><Donut data={jobLevel} centerLabel="Karyawan" /></div>
            <div className="px-5"><Legend data={jobLevel} /></div>
          </Card>
        </Reveal>
        <Reveal delay={0.05}>
          <Card className="h-full pb-4">
            <CardHead icon={IcCap} title="Education" to="/hris/statistics/education" />
            <div className="px-3 pt-1"><Donut data={education} centerLabel="Karyawan" /></div>
            <div className="px-5"><Legend data={education} /></div>
          </Card>
        </Reveal>
        <Reveal delay={0.1}>
          <Card className="h-full pb-4">
            <CardHead icon={IcClock} title="Age's" to="/hris/statistics/age" />
            <div className="px-4 pt-3"><VBars data={age} /></div>
          </Card>
        </Reveal>
        <Reveal delay={0.15}>
          <Card className="h-full pb-4">
            <CardHead icon={IcClock} title="Working Time" />
            <div className="px-3 pt-1"><Donut data={workingTime} centerLabel="Karyawan" /></div>
            <div className="px-5"><Legend data={workingTime} /></div>
          </Card>
        </Reveal>
      </div>

      {/* RECENT + EVENTS */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <Reveal className="xl:col-span-8">
          <Card className="h-full">
            <div className="flex items-center gap-2.5 px-5 pt-4">
              <IcUsers width={17} height={17} className="text-navy" />
              <h2 className="text-[14.5px] font-bold text-navy">Recent Employees</h2>
              <Link to="/hris/export/employees" className="ml-auto flex items-center gap-1 text-[12.5px] font-medium text-mut hover:text-navy">View all <IcChevron width={14} height={14} /></Link>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="border-y border-line text-left text-[11px] uppercase tracking-[0.05em] text-mut">
                    <th className="px-5 py-2.5 font-semibold">Nama</th>
                    <th className="px-5 py-2.5 font-semibold">NIK</th>
                    <th className="px-5 py-2.5 font-semibold">Departemen</th>
                    <th className="px-5 py-2.5 font-semibold">Tanggal Masuk</th>
                    <th className="px-5 py-2.5 font-semibold">Status</th>
                    <th className="px-5 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {loading && <tr><td colSpan={6} className="px-5 py-8 text-center text-mut">Memuat karyawan…</td></tr>}
                  {!loading && recent.length === 0 && <tr><td colSpan={6} className="px-5 py-8 text-center text-mut">Belum ada data karyawan.</td></tr>}
                  {recent.map((r, i) => (
                    <motion.tr key={r.NIP} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                      className="group border-b border-line last:border-0 hover:bg-soft">
                      <td className="px-5 py-3">
                        <span className="flex items-center gap-3">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-navy text-[11px] font-bold text-lime transition-transform group-hover:scale-105">{initials(r.Name)}</span>
                          <span className="font-semibold text-navy whitespace-nowrap">{r.Name}</span>
                        </span>
                      </td>
                      <td className="px-5 py-3 text-mut tnum">{r.NIK || '-'}</td>
                      <td className="px-5 py-3 text-mut">{r.Department}</td>
                      <td className="px-5 py-3 text-mut tnum">{fmtDate(r.WorkingDate)}</td>
                      <td className="px-5 py-3">
                        <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${r.Status === 'Tetap' ? 'bg-soft text-navy' : 'bg-lime-soft text-navy'}`}>{r.Status}</span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link to={`/hris/employees/${r.NIP}`} className="inline-flex text-mut opacity-0 transition-opacity group-hover:opacity-100" aria-label={`Buka ${r.Name}`}><IcChevron width={16} height={16} /></Link>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </Reveal>

        <Reveal delay={0.05} className="xl:col-span-4">
          <Card className="h-full pb-5">
            <div className="flex items-center gap-2.5 px-5 pt-4">
              <IcUpcoming width={17} height={17} className="text-navy" />
              <h2 className="text-[14.5px] font-bold text-navy">Upcoming Events</h2>
            </div>
            <div className="px-5 pt-4">
              <div className="rounded-lg bg-soft px-4 py-8 text-center text-[12.5px] text-mut">
                Belum ada agenda. Data agenda belum tersedia di sistem.
              </div>
            </div>
          </Card>
        </Reveal>
      </div>
    </div>
    </Page>
  );
}
