import { useContext, useRef, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import Button from "../components/ui/Button";
import Icon from "../components/ui/Icon";

export default function LoginPage() {
    const auth = useContext(AuthContext);

    const [nip, setNip] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const nipRef = useRef(null);
    const pwdRef = useRef(null);

    const onSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!nip.trim()) {
            setError("NIP wajib diisi");
            nipRef.current?.focus();
            return;
        }
        if (!password.trim()) {
            setError("Password wajib diisi");
            pwdRef.current?.focus();
            return;
        }

        setSubmitting(true);
        try {
            await auth.login({ nip: nip.trim(), password: password.trim() });
        } catch (err) {
            const msg = err?.response?.data?.message || err.message || "Login gagal";
            setError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-surface">
            {/* Panel brand — desktop only */}
            <div className="relative hidden w-1/2 overflow-hidden bg-brand lg:flex lg:flex-col lg:justify-between">
                <div
                    className="absolute inset-0 opacity-[0.07]"
                    style={{
                        backgroundImage:
                            "radial-gradient(circle at 20% 20%, #fff 1.5px, transparent 1.5px), radial-gradient(circle at 80% 60%, #fff 1.5px, transparent 1.5px)",
                        backgroundSize: "48px 48px",
                    }}
                    aria-hidden="true"
                />
                <div className="relative z-10 p-10">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-white">
                            <Icon name="send" size={20} />
                        </div>
                        <div>
                            <div className="text-lg font-bold leading-tight text-white">WAG</div>
                            <div className="text-xs text-white/70">WhatsApp Gateway</div>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 px-10 pb-12">
                    <h1 className="max-w-md text-3xl font-bold leading-snug text-white">
                        Operasional pesan WhatsApp perusahaan, dalam satu dashboard.
                    </h1>
                    <ul className="mt-8 space-y-3.5">
                        {[
                            "Broadcast massal ke seluruh karyawan",
                            "Pengingat otomatis SIM A & SIM C",
                            "Penjadwalan pesan hari kerja",
                            "Monitoring masa berlaku SIM secara real-time",
                        ].map((item) => (
                            <li key={item} className="flex items-center gap-3 text-sm text-white/85">
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/15 text-white">
                                    <Icon name="check" size={12} strokeWidth={3} />
                                </span>
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="relative z-10 border-t border-white/10 px-10 py-5 text-xs text-white/50">
                    © {new Date().getFullYear()} WAG — Internal Enterprise Tool
                </div>
            </div>

            {/* Form */}
            <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
                <div className="w-full max-w-[400px]">
                    {/* Brand — mobile */}
                    <div className="mb-8 flex items-center gap-3 lg:hidden">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white">
                            <Icon name="send" size={20} />
                        </div>
                        <div>
                            <div className="text-base font-bold leading-tight text-txt">WAG</div>
                            <div className="text-xs text-txt-muted">WhatsApp Gateway</div>
                        </div>
                    </div>

                    <h2 className="text-xl font-bold text-txt">Selamat datang kembali</h2>
                    <p className="mt-1 text-sm text-txt-muted">Masuk menggunakan NIP &amp; Nomor HP terdaftar</p>

                    <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
                        {/* NIP Field */}
                        <div>
                            <label htmlFor="nip" className="mb-1.5 block text-[13px] font-medium text-txt-secondary">
                                NIP
                            </label>
                            <div className="relative">
                                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-txt-placeholder">
                                    <Icon name="id-card" size={17} />
                                </span>
                                <input
                                    ref={nipRef}
                                    id="nip"
                                    value={nip}
                                    onChange={(e) => {
                                        setNip(e.target.value);
                                        setError("");
                                    }}
                                    inputMode="numeric"
                                    autoFocus
                                    placeholder="Masukkan NIP Anda"
                                    className="h-11 w-full rounded-xl border border-surface-border bg-white pl-10 pr-4 text-sm text-txt placeholder:text-txt-placeholder outline-none transition-all duration-150 focus:border-brand focus:ring-4 focus:ring-brand/10"
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div>
                            <label htmlFor="password" className="mb-1.5 block text-[13px] font-medium text-txt-secondary">
                                Password
                            </label>
                            <div className="relative">
                                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-txt-placeholder">
                                    <Icon name="lock" size={17} />
                                </span>
                                <input
                                    ref={pwdRef}
                                    id="password"
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        setError("");
                                    }}
                                    inputMode="tel"
                                    placeholder="Nomor HP terdaftar"
                                    type={showPassword ? "text" : "password"}
                                    className="h-11 w-full rounded-xl border border-surface-border bg-white pl-10 pr-11 text-sm text-txt placeholder:text-txt-placeholder outline-none transition-all duration-150 focus:border-brand focus:ring-4 focus:ring-brand/10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-txt-muted transition-colors hover:text-txt"
                                >
                                    <Icon name={showPassword ? "eye-off" : "eye"} size={17} />
                                </button>
                            </div>
                            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-txt-muted">
                                <Icon name="info" size={13} />
                                Password diisi dengan nomor HP yang terdaftar
                            </p>
                        </div>

                        {/* Error */}
                        {error && (
                            <div
                                role="alert"
                                className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-danger-soft px-4 py-3 text-[13px] text-danger"
                            >
                                <Icon name="alert-triangle" size={16} className="mt-px shrink-0" />
                                {error}
                            </div>
                        )}

                        <Button type="submit" size="lg" fullWidth loading={submitting} icon="logout" className="!rounded-xl">
                            {submitting ? "Memproses..." : "Masuk"}
                        </Button>
                    </form>

                    <p className="mt-8 text-center text-xs text-txt-muted">Sesi terenkripsi • Tidak ada fitur register</p>
                </div>
            </div>
        </div>
    );
}
