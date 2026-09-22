import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import Avatar from "../components/Avatar";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Icon from "../components/ui/Icon";
import Button from "../components/ui/Button";
import PageHeader from "../components/ui/PageHeader";
import { getRoleLabel } from "../utils/permissions";

const ROLE_DESCRIPTIONS = {
    admin: "Akses penuh ke seluruh fitur WAG, termasuk pengaturan dan pengiriman.",
    operator: "Dapat mengirim pesan, membuat jadwal, dan mengelola konfigurasi.",
    viewer: "Hanya dapat melihat data. Operasi pengiriman & pengaturan dinonaktifkan.",
};

export default function ProfilePage() {
    const auth = useContext(AuthContext);
    const user = auth?.user;

    const roleVariant = user?.role === "admin" ? "brand" : user?.role === "operator" ? "info" : "neutral";

    return (
        <div className="mx-auto max-w-2xl space-y-5">
            <PageHeader title="Profil" description="Informasi akun Anda" />

            <Card className="p-6">
                <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
                    <Avatar name={user?.nama} size={64} />
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                            <h2 className="text-lg font-bold text-txt">{user?.nama || "—"}</h2>
                            <Badge variant={roleVariant}>{getRoleLabel(user?.role)}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-txt-muted">NIP: <span className="font-mono text-txt-secondary">{user?.nip || "—"}</span></p>
                        <p className="mt-2 text-[13px] leading-relaxed text-txt-muted">{ROLE_DESCRIPTIONS[user?.role] || "Pengguna terdaftar."}</p>
                    </div>
                </div>
            </Card>

            <Card className="p-6">
                <h3 className="mb-4 text-sm font-bold text-txt">Keamanan Sesi</h3>
                <ul className="space-y-3">
                    <li className="flex items-start gap-3 text-[13px] text-txt-secondary">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-success-soft text-success">
                            <Icon name="shield" size={14} />
                        </span>
                        <span>Autentikasi menggunakan token JWT yang kedaluwarsa otomatis. Logout akan menghapus sesi dari perangkat ini.</span>
                    </li>
                    <li className="flex items-start gap-3 text-[13px] text-txt-secondary">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-info-soft text-info">
                            <Icon name="lock" size={14} />
                        </span>
                        <span>Hak akses diterapkan di backend. Peran yang tampil di sini hanya untuk panduan antarmuka.</span>
                    </li>
                </ul>
            </Card>

            <Card className="p-6">
                <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
                    <div>
                        <div className="text-sm font-semibold text-txt">Keluar dari WAG</div>
                        <div className="mt-0.5 text-[13px] text-txt-muted">Akhiri sesi dan kembali ke halaman login.</div>
                    </div>
                    <Button variant="danger-outline" icon="logout" onClick={() => auth?.logout()}>
                        Keluar
                    </Button>
                </div>
            </Card>
        </div>
    );
}
