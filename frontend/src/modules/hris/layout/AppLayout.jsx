import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../auth/AuthContext.jsx';
import {
  IcGrid, IcUser, IcOrg, IcClock, IcUsers, IcCalendar,
  IcPoll, IcReport, IcLogout, IcSearch, IcBell, IcChevron, IcMenu, IcClose,
} from '../app/icons.jsx';

const NAV = [
  {
    group: 'Umum',
    items: [
      { label: 'Dasbor', to: '/hris/dashboard', icon: IcGrid },
      { label: 'Karyawan', icon: IcUser, children: [
        { label: 'Data Karyawan', to: '/hris/employees' },
        { label: 'Karyawan Sementara', to: '/hris/temporary' },
        { label: 'Tabel Karyawan', to: '/hris/export/employees' },
      ] },
      { label: 'Organisasi', icon: IcOrg, children: [
        { label: 'Divisi', to: '/hris/divisions' },
        { label: 'Departemen', to: '/hris/departments' },
        { label: 'Tingkat Jabatan', to: '/hris/joblevels' },
        { label: 'Nama Jabatan', to: '/hris/jobtitles' },
        { label: 'Komposisi', to: '/hris/manpower/resource' },
      ] },
      { label: 'Sumber Daya Manusia', icon: IcUsers, children: [
        { label: 'Kedisiplinan', to: '/hris/disciplinary' },
        { label: 'Kompetensi Karyawan', to: '/hris/competence/employee' },
        { label: 'Pride', to: '/hris/competence/pride' },
        { label: 'Pelatihan', to: '/hris/training' },
        { label: 'Peserta Pelatihan', to: '/hris/training/participants' },
        { label: 'Kebijakan HR', to: '/hris/pkb' },
      ] },
      { label: 'Cuti Karyawan', icon: IcCalendar, children: [
        { label: 'Saldo Cuti', to: '/hris/leave/day' },
        { label: 'Cuti Mendadak', to: '/hris/leave/sudden' },
        { label: 'Riwayat Cuti', to: '/hris/leave/log' },
      ] },
      { label: 'Izin & Cuti Khusus', icon: IcCalendar, children: [
        { label: 'Izin', to: '/hris/permit' },
        { label: 'Cuti Khusus', to: '/hris/special-leave' },
      ] },
      { label: 'SKK', icon: IcReport, children: [
        { label: 'Bagikan SKK', to: '/hris/skk/share' },
        { label: 'Laporan SKK Periode', to: '/hris/skk/report' },
      ] },
      { label: 'Polling', to: '/hris/polling', icon: IcPoll },
      { label: 'Laporan', icon: IcReport, children: [
        { label: 'Pendidikan', to: '/hris/statistics/education' },
        { label: 'Usia', to: '/hris/statistics/age' },
        { label: 'Daftar Karyawan', to: '/hris/statistics/employees' },
        { label: 'Pensiun', to: '/hris/statistics/retired' },
        { label: 'Level Dua', to: '/hris/statistics/level-two' },
      ] },
    ],
  },
];

const LEAVES = NAV.flatMap((g) => g.items.flatMap((it) =>
  it.children ? it.children.map((c) => ({ label: c.label, to: c.to, parent: it.label }))
    : it.to ? [{ label: it.label, to: it.to, parent: g.group }] : []));

const SOFT = { duration: 0.26, ease: [0.25, 0.8, 0.25, 1] };
const initials = (s = '') => s.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'HR';
const isActiveLeaf = (pathname, to) => pathname === to || pathname.startsWith(to + '/');
const parentActive = (pathname, item) => (item.to ? isActiveLeaf(pathname, item.to) : false)
  || (item.children ? item.children.some((c) => isActiveLeaf(pathname, c.to)) : false);

/* ---------- komponen modul-scope (stabil, tidak remount tiap render) ---------- */

function Brand({ compact }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-5 ${compact ? 'justify-center px-0' : ''}`}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-navy text-[13px] font-extrabold text-lime">HR</span>
      {!compact && (
        <div className="min-w-0">
          <div className="text-[15px] font-extrabold tracking-tight text-navy">HRIS</div>
          <div className="truncate text-[10.5px] leading-tight text-mut">Sistem Manajemen Sumber Daya Manusia</div>
        </div>
      )}
    </div>
  );
}

function BrandCard() {
  return (
    <div className="relative mx-3 mb-2 overflow-hidden rounded-2xl bg-lime-soft px-4 pb-4 pt-5">
      <svg className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 text-lime" viewBox="0 0 100 100" fill="currentColor" aria-hidden="true">
        <path d="M50 0c28 0 50 22 50 50S78 100 50 100 0 78 0 50 22 0 50 0zm0 14c-20 0-36 16-36 36s16 36 36 36 36-16 36-36-16-36-36-36z" opacity="0.55" />
      </svg>
      <p className="relative text-[12.5px] font-bold leading-tight text-navy">People<br />Process<br />Progress.</p>
      <div className="relative mt-3 h-px w-10 bg-lime" />
      <p className="relative mt-2 text-[11px] font-semibold tracking-wide text-navy/70">H R I S <span className="text-navy/40">v2.0.0</span></p>
    </div>
  );
}

function NavItems({ compact, pathname, open, toggleGroup, go, setDrawer }) {
  return (
    <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="Navigasi utama">
      {NAV[0].items.map((it) => {
        const Icon = it.icon;
        const active = parentActive(pathname, it);
        const isOpen = open.has(it.label);

        if (it.soon) {
          return (
            <div key={it.label} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] text-mut/60" title="Belum tersedia">
              <Icon className="shrink-0" />
              {!compact && <span className="flex-1 truncate">{it.label}</span>}
              {!compact && <span className="rounded bg-soft px-1.5 py-0.5 text-[10px] font-semibold uppercase text-mut">segera</span>}
            </div>
          );
        }

        if (it.children) {
          return (
            <div key={it.label}>
              <button
                type="button"
                onClick={() => (compact ? go(it.children[0].to) : toggleGroup(it.label))}
                aria-expanded={isOpen} title={it.label}
                className={`flex w-full items-center gap-3 rounded-lg bg-transparent px-3 py-2.5 text-left text-[13.5px] transition-colors duration-200 ${
                  active ? 'bg-lime-soft font-semibold text-navy hover:bg-[#dcf3b8]' : 'text-mut hover:bg-soft hover:text-navy'
                }`}
              >
                <Icon className="shrink-0" />
                {!compact && <span className="flex-1 truncate">{it.label}</span>}
                {!compact && (
                  <IcChevron width={14} height={14}
                    className={`shrink-0 transition-transform duration-300 ease-out ${isOpen ? 'rotate-90 text-navy/60' : 'text-mut/60'}`} />
                )}
              </button>

              <AnimatePresence initial={false}>
                {isOpen && !compact && (
                  <motion.div
                    key="sub"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ height: SOFT, opacity: { duration: 0.2, ease: 'easeOut' } }}
                    style={{ overflow: 'hidden', willChange: 'height' }}
                  >
                    <div className="ml-[26px] border-l border-line pb-1 pl-3 pt-0.5">
                      {it.children.map((c) => (
                        <NavLink key={c.to} to={c.to} onClick={() => setDrawer(false)}
                          className={({ isActive }) => `block rounded-md px-2.5 py-2 text-[13px] transition-colors duration-200 ${
                            isActive ? 'bg-soft font-semibold text-navy' : 'text-mut hover:bg-soft hover:text-navy'}`}>
                          {c.label}
                        </NavLink>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        }

        return (
          <NavLink key={it.to} to={it.to} onClick={() => setDrawer(false)} title={it.label}
            className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] transition-colors duration-200 ${
              isActive ? 'bg-lime-soft font-semibold text-navy' : 'text-mut hover:bg-soft hover:text-navy'}`}>
            <Icon className="shrink-0" />
            {!compact && <span className="flex-1 truncate">{it.label}</span>}
          </NavLink>
        );
      })}
    </nav>
  );
}

function SidebarInner({ compact, pathname, open, toggleGroup, go, setDrawer, onLogout }) {
  return (
    <>
      <Brand compact={compact} />
      <NavItems compact={compact} pathname={pathname} open={open} toggleGroup={toggleGroup} go={go} setDrawer={setDrawer} />
      <div className="px-3 pb-3">
        {!compact && <BrandCard />}
        <button type="button" onClick={onLogout} title="Keluar"
          className="flex w-full items-center gap-3 rounded-lg bg-transparent px-3 py-2.5 text-[13.5px] text-mut transition-colors hover:bg-soft hover:text-navy">
          <IcLogout className="shrink-0" />
          {!compact && <span>Keluar</span>}
        </button>
      </div>
    </>
  );
}

export default function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [open, setOpen] = useState(() => new Set());
  const [q, setQ] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth;
      setMobile(w < 768);
      setCollapsed(w >= 768 && w < 1024);
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => { if (!mobile) setDrawer(false); }, [mobile]);

  useEffect(() => {
    setOpen((prev) => {
      const next = new Set(prev);
      NAV[0].items.forEach((it) => { if (it.children && parentActive(pathname, it)) next.add(it.label); });
      return next;
    });
  }, [pathname]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); searchRef.current?.focus(); setSearchOpen(true); }
      if (e.key === 'Escape') { setSearchOpen(false); setNotifOpen(false); setUserOpen(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return LEAVES.slice(0, 8);
    return LEAVES.filter((l) => l.label.toLowerCase().includes(s) || l.parent.toLowerCase().includes(s)).slice(0, 8);
  }, [q]);

  const toggleGroup = (label) => setOpen((prev) => {
    const next = new Set(prev);
    next.has(label) ? next.delete(label) : next.add(label);
    return next;
  });

  const go = (to) => { navigate(to); setDrawer(false); setSearchOpen(false); setQ(''); };
  const doLogout = () => { logout(); navigate('/hris/login'); };

  return (
    <div className="shell flex min-h-screen bg-soft">
      <aside className={`${collapsed ? 'w-[76px]' : 'w-[252px]'} sticky top-0 hidden h-screen shrink-0 flex-col border-r border-line bg-white transition-[width] duration-200 ease-out md:flex`}>
        <SidebarInner compact={collapsed} pathname={pathname} open={open} toggleGroup={toggleGroup} go={go} setDrawer={setDrawer} onLogout={doLogout} />
      </aside>

      <AnimatePresence>
        {mobile && drawer && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-navy/40 md:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawer(false)} />
            <motion.aside className="fixed inset-y-0 left-0 z-50 flex w-[268px] flex-col border-r border-line bg-white md:hidden"
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}>
              <div className="flex items-center justify-between pl-1 pr-3">
                <Brand compact={false} />
                <button type="button" onClick={() => setDrawer(false)} aria-label="Tutup menu" className="rounded-lg bg-transparent p-2 text-mut hover:bg-soft hover:text-navy"><IcClose /></button>
              </div>
              <NavItems compact={false} pathname={pathname} open={open} toggleGroup={toggleGroup} go={go} setDrawer={setDrawer} />
              <div className="px-3 pb-3">
                <BrandCard />
                <button type="button" onClick={doLogout} className="flex w-full items-center gap-3 rounded-lg bg-transparent px-3 py-2.5 text-[13.5px] text-mut hover:bg-soft hover:text-navy">
                  <IcLogout className="shrink-0" /> <span>Keluar</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-white px-4 sm:px-6">
          <button type="button" onClick={() => (mobile ? setDrawer(true) : setCollapsed((v) => !v))} aria-label="Buka/tutup navigasi"
            className="grid h-9 w-9 place-items-center rounded-lg bg-transparent text-navy hover:bg-soft">
            <IcMenu />
          </button>

          <div className="relative w-full max-w-[420px]">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mut"><IcSearch width={16} height={16} /></span>
            <input ref={searchRef} value={q}
              onChange={(e) => { setQ(e.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
              placeholder="Cari karyawan, menu, atau apa pun…"
              className="w-full rounded-lg border border-line bg-soft py-2.5 pl-9 pr-16 text-[13.5px] text-navy placeholder:text-mut/70" aria-label="Pencarian" />
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-line bg-white px-1.5 py-0.5 text-[10.5px] font-semibold text-mut">Ctrl K</span>
            {searchOpen && results.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-xl border border-line bg-white shadow-[0_24px_50px_-30px_rgba(11,31,58,.5)]">
                {results.map((r) => (
                  <button key={r.to} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => go(r.to)}
                    className="flex w-full items-center justify-between bg-transparent px-3.5 py-2.5 text-left text-[13px] transition-colors duration-150 hover:bg-lime-soft">
                    <span className="font-medium text-navy">{r.label}</span>
                    <span className="text-[11.5px] text-mut">{r.parent}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <div className="relative">
              <button type="button" onClick={() => { setNotifOpen((v) => !v); setUserOpen(false); }} aria-label="Notifikasi"
                className="relative grid h-9 w-9 place-items-center rounded-lg bg-transparent text-navy hover:bg-soft">
                <IcBell />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#EF4444]" />
              </button>
              <AnimatePresence>
                {notifOpen && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                    className="absolute right-0 top-full z-40 mt-2 w-72 rounded-xl border border-line bg-white p-4 shadow-[0_24px_50px_-30px_rgba(11,31,58,.5)]">
                    <div className="text-[13px] font-bold text-navy">Notifikasi</div>
                    <div className="mt-2 rounded-lg bg-soft px-3 py-6 text-center text-[12.5px] text-mut">Belum ada notifikasi.</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="relative">
              <button type="button" onClick={() => { setUserOpen((v) => !v); setNotifOpen(false); }}
                className="flex items-center gap-2.5 rounded-lg bg-transparent py-1 pl-1 pr-2 hover:bg-soft" aria-expanded={userOpen}>
                <span className="grid h-9 w-9 place-items-center rounded-full bg-navy text-[12px] font-bold text-lime">{initials(user?.name || user?.sub)}</span>
                <span className="hidden text-left leading-tight sm:block">
                  <span className="block text-[13px] font-semibold text-navy">{user?.name || user?.sub}</span>
                  <span className="block text-[11px] text-mut">{user?.role === 'employee' ? 'Karyawan' : (user?.role || 'Karyawan')}</span>
                </span>
                <IcChevron width={14} height={14} className={`hidden text-mut transition-transform sm:block ${userOpen ? 'rotate-90' : ''}`} />
              </button>
              <AnimatePresence>
                {userOpen && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                    className="absolute right-0 top-full z-40 mt-2 w-48 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-[0_24px_50px_-30px_rgba(11,31,58,.5)]">
                    <div className="border-b border-line px-3.5 py-2.5">
                      <div className="text-[13px] font-semibold text-navy">{user?.name || user?.sub}</div>
                      <div className="text-[11.5px] text-mut">{user?.role === 'employee' ? 'Karyawan' : (user?.role || 'Karyawan')}</div>
                    </div>
                    <button type="button" onClick={doLogout}
                      className="flex w-full items-center gap-2.5 bg-transparent px-3.5 py-2.5 text-left text-[13px] text-navy hover:bg-soft">
                      <IcLogout width={16} height={16} /> Keluar
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-7">{children}</main>
      </div>
    </div>
  );
}
