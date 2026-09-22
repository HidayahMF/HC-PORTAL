import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowUpRight, FileText, MessageCircle, NotebookTabs } from 'lucide-react';
import './index.css';

const apps = [
  { name: 'Nomor Surat', description: 'Pengajuan dan monitoring nomor surat.', href: '/nomor-surat/', icon: FileText, tag: 'Administrasi' },
  { name: 'Kontrak Karyawan', description: 'Pengelolaan dan monitoring kontrak karyawan.', href: '/kontrak/', icon: NotebookTabs, tag: 'People operations' },
  { name: 'WhatsApp Gateway', description: 'Monitoring SIM, broadcast, dan jadwal pesan.', href: '/wag/', icon: MessageCircle, tag: 'Communication' },
];

function App() {
  return <div className="min-h-screen bg-bmc-canvas text-bmc-ink">
    <header className="border-b border-bmc-border bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 lg:px-8">
        <a href="/" className="flex items-center gap-3" aria-label="BMC Home"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-bmc-navy text-lg font-black tracking-tight text-white">B</span><span className="text-lg font-bold tracking-[0.18em] text-bmc-navy">BMC<span className="text-bmc-gold">.</span></span></a>
        <a href="https://bmc.co.id" target="_blank" rel="noreferrer" className="group flex items-center gap-2 rounded-full border border-bmc-border px-4 py-2 text-sm font-semibold text-bmc-navy transition hover:border-bmc-navy hover:bg-bmc-navy hover:text-white">Visit Site <ArrowUpRight size={15} className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></a>
      </div>
    </header>
    <main className="mx-auto max-w-6xl px-6 pb-20 pt-16 lg:px-8 lg:pt-24">
      <section className="max-w-2xl"><p className="mb-5 text-xs font-bold uppercase tracking-[0.25em] text-bmc-gold">Human Capital Portal</p><h1 className="text-4xl font-bold tracking-[-0.04em] text-bmc-navy sm:text-6xl">Everything you need.</h1><p className="mt-5 max-w-xl text-lg leading-8 text-slate-500">A centralized platform for all your operational needs.</p></section>
      <section className="mt-14 grid gap-5 md:grid-cols-3" aria-label="Aplikasi HC Portal">{apps.map(({ name, description, href, icon: Icon, tag }) => <a key={name} href={href} className="group relative flex min-h-64 flex-col justify-between overflow-hidden rounded-2xl border border-bmc-border bg-white p-6 shadow-[0_8px_30px_rgba(13,31,92,0.03)] transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_18px_40px_rgba(13,31,92,0.1)]"><div><div className="mb-8 flex items-center justify-between"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-bmc-navy transition group-hover:bg-bmc-navy group-hover:text-white"><Icon size={23} strokeWidth={1.8} /></span><ArrowUpRight size={19} className="text-slate-300 transition group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-bmc-navy" /></div><h2 className="text-xl font-bold text-bmc-navy">{name}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{description}</p></div><span className="mt-8 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">{tag}</span></a>)}</section>
      <p className="mt-12 text-sm text-slate-400">Akses aplikasi menggunakan akun dan hak akses masing-masing sistem.</p>
    </main>
  </div>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
