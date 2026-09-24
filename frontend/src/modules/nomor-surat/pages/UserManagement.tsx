import { useEffect, useState } from 'react';
import { Search, ShieldCheck, Trash2 } from 'lucide-react';
import { api } from '../api';
import { HrisEmployee, ManagedUser } from '../types';
import { ErrorMessage, Spinner } from '../components/States';

export function UserManagement() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [employees, setEmployees] = useState<HrisEmployee[]>([]);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('HR');
  const [selected, setSelected] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentRole, setCurrentRole] = useState('ADMIN');

  const load = async () => {
    try {
      setUsers(await api.adminUsers());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Gagal memuat akses pengguna.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    api.me().then(({ user }) => setCurrentRole(user.role)).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (currentRole !== 'ADMIN') return;
    const timer = setTimeout(() => {
      api.hrisEmployees(search).then(setEmployees).catch(() => setEmployees([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [search, currentRole]);

  const grant = async () => {
    if (!selected) return;
    try {
      await api.grantAccess({ nip: selected, role });
      setSelected('');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Gagal memberikan akses.');
    }
  };

  const update = async (nip: string, input: { role?: string; isActive?: boolean }) => {
    try {
      await api.updateAccess(nip, input);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Gagal memperbarui akses.');
    }
  };

  const remove = async (user: ManagedUser) => {
    if (!window.confirm(`Hapus akses pengguna ${user.name} (${user.nip})?`)) return;
    try {
      await api.deleteAccess(user.nip);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Gagal menghapus akses pengguna.');
    }
  };

  return (
    <div>
      <div className="mb-7">
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-bmc-red">Administrasi</p>
        <h1 className="text-2xl font-semibold">Manajemen Pengguna</h1>
        <p className="mt-1 text-sm text-bmc-muted">Akun berasal dari HRIS. VisitorBMC hanya mengatur akses, role, dan status.</p>
      </div>
      {error && <div className="mb-5"><ErrorMessage message={error} /></div>}
      {currentRole === 'ADMIN' && (
        <section className="mb-7 border border-bmc-border bg-white p-5">
          <h2 className="text-lg font-semibold">Tambah Akses Pengguna</h2>
          <p className="mt-1 text-sm text-bmc-muted">Pilih karyawan HRIS aktif dan tentukan role aplikasi.</p>
          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_180px_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-bmc-muted" size={16} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} className="field pl-9" placeholder="Cari nama atau NIP..." />
              <select value={selected} onChange={(event) => setSelected(event.target.value)} className="field mt-2">
                <option value="">Pilih karyawan HRIS</option>
                {employees.map((employee) => <option key={employee.nip} value={employee.nip}>{employee.name} ({employee.nip})</option>)}
              </select>
            </div>
            <select value={role} onChange={(event) => setRole(event.target.value)} className="field">
              <option value="HR">HR</option>
              <option value="ADMIN">Administrator</option>
            </select>
            <button onClick={grant} disabled={!selected} className="btn-primary"><ShieldCheck size={16} /> Berikan Akses</button>
          </div>
        </section>
      )}
      <section className="border border-bmc-border bg-white">
        {loading ? <div className="p-8"><Spinner /></div> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-bmc-muted">
                <tr><th className="px-5 py-3">Nama</th><th className="px-5 py-3">NIP</th><th className="px-5 py-3">Role</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Aksi</th></tr>
              </thead>
              <tbody className="divide-y divide-bmc-border">
                {users.map((user) => <tr key={user.nip}>
                  <td className="px-5 py-4 font-medium">{user.name}</td>
                  <td className="px-5 py-4">{user.nip}</td>
                  <td className="px-5 py-4"><select value={user.role} disabled={currentRole !== 'ADMIN'} onChange={(event) => update(user.nip, { role: event.target.value })} className="field max-w-[150px]"><option value="ADMIN">Administrator</option><option value="HR">HR</option></select></td>
                  <td className="px-5 py-4"><button disabled={currentRole !== 'ADMIN'} onClick={() => update(user.nip, { isActive: !user.isActive })} className="font-medium text-bmc-navy hover:underline">{user.isActive ? 'Aktif' : 'Nonaktif'}</button></td>
                  <td className="px-5 py-4">{currentRole === 'ADMIN' && <button onClick={() => remove(user)} className="btn-secondary text-red-700"><Trash2 size={15} /> Hapus Akses</button>}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
