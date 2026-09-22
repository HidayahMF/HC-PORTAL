import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { FilePlus2, LayoutDashboard, LogIn, LogOut, Users } from 'lucide-react';
import logo from '../assets/logobmcbg1.png';
import { api } from '../api';
import { useEffect, useState } from 'react';

export function Layout({ publicOnly = false }: { publicOnly?: boolean }) {
  const navigate = useNavigate();
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    if (publicOnly) api.me().then(() => setHasSession(true)).catch(() => setHasSession(false));
  }, [publicOnly]);

  const logout = async () => { await api.logout().catch(() => undefined); navigate('/login', { replace: true }); };
  const login = async () => {
    if (hasSession) { navigate('/dashboard', { replace: true }); return; }
    navigate('/login');
  };

  return <div className="min-h-screen"><header className="border-b border-bmc-border bg-white"><div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-3 lg:px-8"><div className="flex items-center gap-3"><img src={logo} alt="Braja Mukti Cakra" className="h-9 w-auto max-w-[190px] object-contain object-left"/><div className="h-7 border-l border-bmc-border"/><div className="text-sm font-semibold text-bmc-dark">Nomor Surat</div></div><nav className="flex items-center gap-1">{!publicOnly&&<><NavLink to="/dashboard" className={({isActive}) => `flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium ${isActive ? 'border-bmc-gold text-bmc-navy' : 'border-transparent text-bmc-muted hover:text-bmc-dark'}`}><LayoutDashboard size={16}/>Dashboard</NavLink><NavLink to="/admin/users" className={({isActive}) => `flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium ${isActive ? 'border-bmc-gold text-bmc-navy' : 'border-transparent text-bmc-muted hover:text-bmc-dark'}`}><Users size={16}/>Administrasi</NavLink><button onClick={logout} className="ml-2 flex items-center gap-2 px-3 py-2 text-sm font-medium text-bmc-muted hover:text-bmc-dark"><LogOut size={16}/>Keluar</button></>}{publicOnly?<button onClick={login} className="flex items-center gap-2 border-b-2 border-transparent px-3 py-2 text-sm font-medium text-bmc-muted hover:border-bmc-gold hover:text-bmc-dark"><LogIn size={16}/>{hasSession?'Dashboard':'Login Admin'}</button>:<NavLink to="/letters/new" className={({isActive}) => `flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium ${isActive ? 'border-bmc-gold text-bmc-navy' : 'border-transparent text-bmc-muted hover:text-bmc-dark'}`}><FilePlus2 size={16}/>Buat Nomor Surat</NavLink>}</nav></div></header><main className="mx-auto max-w-[1440px] px-5 py-7 lg:px-8"><Outlet/></main></div>;
}
