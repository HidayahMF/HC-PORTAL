import { FormEvent, useState } from 'react';
import { LogIn } from 'lucide-react';
import { api } from '../api';
import { ErrorMessage, Spinner } from '../components/States';
import logo from '../assets/logobmcbg1.png';

export function Login() {
  const [nip, setNip] = useState('');
  const [birthCode, setBirthCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.login({ nip, birthCode });
      location.replace('/dashboard');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Login gagal.');
    } finally {
      setLoading(false);
    }
  };

  return <main className="flex min-h-screen items-center justify-center bg-bmc-canvas px-5 py-8">
    <section className="w-full max-w-md border border-bmc-border bg-white p-7 shadow-sm sm:p-9">
      <div className="mb-8 text-center">
        <img src={logo} alt="Braja Mukti Cakra" className="mx-auto h-12 w-auto max-w-[260px] object-contain" />
        <div className="mx-auto mt-5 h-px w-10 bg-bmc-gold" />
        <h1 className="mt-5 text-xl font-semibold text-bmc-navy">Login Kontrak Karyawan</h1>
        <p className="mt-1 text-sm text-bmc-muted">Masuk menggunakan data employee HRIS.</p>
      </div>
      {error && <div className="mb-5"><ErrorMessage message={error} /></div>}
      <form onSubmit={submit} className="space-y-5">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold">NIP</span>
          <input required maxLength={50} value={nip} onChange={event => setNip(event.target.value)} className="field" placeholder="Masukkan NIP" />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold">Tanggal Lahir</span>
          <input required inputMode="numeric" pattern="[0-9]{6,8}" minLength={6} maxLength={8} value={birthCode} onChange={event => setBirthCode(event.target.value.replace(/\D/g, '').slice(0, 8))} className="field" placeholder="DDMMYYYY" />
          <span className="mt-1 block text-xs text-bmc-muted">Format: DDMMYYYY, contoh 11 April 2008 menjadi 11042008.</span>
        </label>
        <button disabled={loading} className="btn-primary w-full">{loading && <Spinner />}<LogIn size={16} />Masuk</button>
      </form>
    </section>
  </main>;
}
