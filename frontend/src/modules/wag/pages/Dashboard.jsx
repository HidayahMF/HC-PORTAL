import { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import API from "../services/api";
import { fetchAllSimEmployees } from "../services/monitoring";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Icon from "../components/ui/Icon";
import StatCard from "../components/ui/StatCard";
import Skeleton, { SkeletonRows } from "../components/ui/Skeleton";
import ErrorState from "../components/ui/ErrorState";
import Button from "../components/ui/Button";
import { getRoleLabel } from "../utils/permissions";

const SERVICE_LABELS = {
    backend: "Backend",
    sqlServer: "SQL Server",
    mysql: "MySQL",
    whatsappGateway: "WhatsApp Gateway",
};

function SystemStatusCard({ health, loading, onRetry }) {
    const services = health?.services || {};
    const list = Object.keys(SERVICE_LABELS);

    if (loading) {
        return (
            <Card className="p-5">
                <div className="mb-4 text-sm font-bold text-txt">Status Sistem</div>
                <div className="space-y-3">
                    {list.map((k) => (
                        <div key={k} className="flex items-center gap-3">
                            <Skeleton className="h-3 w-3 rounded-full" />
                            <Skeleton className="h-3.5 w-28" />
                        </div>
                    ))}
                </div>
            </Card>
        );
    }

    if (!health) {
        return (
            <Card className="p-5">
                <div className="mb-4 text-sm font-bold text-txt">Status Sistem</div>
                <div className="py-4 text-center">
                    <p className="text-[13px] text-txt-muted">Status layanan tidak tersedia.</p>
                    {onRetry && (
                        <Button variant="secondary" size="sm" icon="refresh" className="mt-3" onClick={onRetry}>
                            Muat Ulang
                        </Button>
                    )}
                </div>
            </Card>
        );
    }

    return (
        <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
                <div className="text-sm font-bold text-txt">Status Sistem</div>
                <Badge variant={health.status === "ok" ? "success" : "warning"} dot>
                    {health.status === "ok" ? "Operasional" : "Degradasi"}
                </Badge>
            </div>
            <ul className="space-y-3">
                {list.map((k) => {
                    const state = services[k];
                    const labelText =
                        state === "ok"
                            ? "Normal"
                            : state === "error"
                              ? "Bermasalah"
                              : state === "not_configured"
                                ? "Belum dikonfigurasi"
                                : "—";
                    return (
                        <li key={k} className="flex items-center gap-3">
                            <span className={`h-2 w-2 rounded-full ${state === "ok" ? "bg-success" : state === "error" ? "bg-danger" : "bg-neutral"}`} aria-hidden="true" />
                            <span className="flex-1 text-[13px] font-medium text-txt-secondary">{SERVICE_LABELS[k]}</span>
                            <span className={`text-xs font-semibold ${state === "ok" ? "text-success" : state === "error" ? "text-danger" : "text-txt-muted"}`}>
                                {labelText}
                            </span>
                        </li>
                    );
                })}
            </ul>
        </Card>
    );
}

const QUICK_ACTIONS = [
    { to: "/broadcast", label: "Broadcast", desc: "Kirim pesan massal", icon: "send" },
    { to: "/scheduled", label: "Buat Jadwal", desc: "Pesan otomatis terjadwal", icon: "calendar-clock" },
    { to: "/monitoring", label: "Monitoring SIM", desc: "Pantau masa berlaku SIM", icon: "monitoring" },
];

export default function Dashboard() {
    const auth = useContext(AuthContext);
    const user = auth.user;

    const [health, setHealth] = useState(null);
    const [healthLoading, setHealthLoading] = useState(true);

    const [monitoring, setMonitoring] = useState(null);
    const [monitoringLoading, setMonitoringLoading] = useState(true);
    const [monitoringError, setMonitoringError] = useState(false);

    const [schedules, setSchedules] = useState(null);
    const [schedulesLoading, setSchedulesLoading] = useState(true);
    const [schedulesError, setSchedulesError] = useState(false);

    const fetchHealth = async () => {
        try {
            // Backend sengaja mengembalikan 503 saat ada layanan bermasalah,
            // tapi body JSON-nya tetap berisi detail per layanan — jangan dibuang.
            const res = await API.get("/health", { validateStatus: () => true });
            if (res.data && typeof res.data === "object" && res.data.services) {
                setHealth(res.data);
            } else {
                setHealth(null);
            }
        } catch {
            // Network error / backend tidak terjangkau.
            setHealth(null);
        }
    };

    const reloadHealth = async () => {
        setHealthLoading(true);
        try {
            await fetchHealth();
        } finally {
            setHealthLoading(false);
        }
    };

    const fetchMonitoring = async () => {
        try {
            // Semua halaman pagination diambil agar statistik akurat (bukan cuma 50 pertama).
            const rows = await fetchAllSimEmployees();
            setMonitoring(rows || []);
            setMonitoringError(false);
        } catch {
            setMonitoring(null);
            setMonitoringError(true);
        }
    };

    const reloadMonitoring = async () => {
        setMonitoringLoading(true);
        try {
            await fetchMonitoring();
        } finally {
            setMonitoringLoading(false);
        }
    };

    const fetchSchedules = async () => {
        try {
            const res = await API.get("/scheduled-messages");
            setSchedules(res.data || []);
            setSchedulesError(false);
        } catch {
            setSchedules(null);
            setSchedulesError(true);
        }
    };

    const reloadSchedules = async () => {
        setSchedulesLoading(true);
        try {
            await fetchSchedules();
        } finally {
            setSchedulesLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            reloadHealth();
            reloadMonitoring();
            reloadSchedules();
        }, 0);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Statistik SIM dari data monitoring nyata.
    const stats = { total: 0, aman: 0, mendesak: 0, expired: 0 };
    (monitoring || []).forEach((r) => {
        const sisa = Math.min(...[r.simc_sisa, r.sima_sisa].filter((n) => n != null));
        stats.total += 1;
        if (sisa == null) return;
        if (sisa < 0) stats.expired += 1;
        else if (sisa <= 14) stats.mendesak += 1;
        else if (sisa > 30) stats.aman += 1;
    });

    const todayLabel = new Date().toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    });

    return (
        <div className="space-y-6">
            {/* Welcome */}
            <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-2xl font-bold tracking-tight text-txt">Selamat datang kembali, {user?.nama || ""}</h1>
                    <Badge variant="brand">{getRoleLabel(user?.role)}</Badge>
                </div>
                <p className="text-[13px] text-txt-muted">{todayLabel}</p>
            </div>

            {/* Status sistem */}
            <SystemStatusCard health={health} loading={healthLoading} onRetry={reloadHealth} />

            {/* Statistik SIM */}
            <section aria-labelledby="stat-sim">
                <h2 id="stat-sim" className="mb-3 text-sm font-bold uppercase tracking-widest text-txt-muted">
                    Statistik SIM
                </h2>
                {monitoringLoading ? (
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-[84px] rounded-2xl" />
                        ))}
                    </div>
                ) : monitoringError ? (
                    <Card>
                        <ErrorState title="Gagal memuat statistik" description="Data monitoring SIM tidak dapat dimuat." onRetry={reloadMonitoring} />
                    </Card>
                ) : (
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <StatCard label="Total Karyawan" value={stats.total} icon="users" tone="brand" />
                        <StatCard label="SIM Aman" value={stats.aman} icon="check" tone="success" />
                        <StatCard label="SIM Mendesak (≤ 14 hari)" value={stats.mendesak} icon="alert-triangle" tone="warning" />
                        <StatCard label="SIM Expired" value={stats.expired} icon="alert-circle" tone="danger" />
                    </div>
                )}
            </section>

            {/* Quick actions */}
            <section aria-labelledby="quick-actions">
                <h2 id="quick-actions" className="mb-3 text-sm font-bold uppercase tracking-widest text-txt-muted">
                    Aksi Cepat
                </h2>
                <div className="grid gap-3 sm:grid-cols-3">
                    {QUICK_ACTIONS.map((action) => (
                        <Link
                            key={action.to}
                            to={action.to}
                            className="group flex items-center gap-4 rounded-2xl border border-surface-border bg-surface-card p-4 shadow-card transition-all duration-150 hover:shadow-card-hover"
                        >
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand transition-colors duration-150 group-hover:bg-brand group-hover:text-white">
                                <Icon name={action.icon} size={20} />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-sm font-bold text-txt">{action.label}</span>
                                <span className="block truncate text-xs text-txt-muted">{action.desc}</span>
                            </span>
                            <Icon name="arrow-up-right" size={16} className="shrink-0 text-txt-placeholder transition-colors group-hover:text-brand" />
                        </Link>
                    ))}
                </div>
            </section>

            {/* Jadwal terdekat */}
            <section aria-labelledby="recent-schedules">
                <div className="mb-3 flex items-center justify-between">
                    <h2 id="recent-schedules" className="text-sm font-bold uppercase tracking-widest text-txt-muted">
                        Jadwal Pesan Terbaru
                    </h2>
                    <Link to="./scheduled" className="flex items-center gap-1 text-xs font-semibold text-brand hover:underline">
                        Lihat semua
                        <Icon name="chevron-right" size={13} />
                    </Link>
                </div>
                {schedulesLoading ? (
                    <Card className="p-5">
                        <SkeletonRows rows={3} />
                    </Card>
                ) : schedulesError || !schedules ? (
                    <Card>
                        <ErrorState title="Gagal memuat jadwal" description="Daftar jadwal pesan tidak dapat dimuat." onRetry={reloadSchedules} />
                    </Card>
                ) : schedules.length === 0 ? (
                    <Card>
                        <div className="flex flex-col items-center px-6 py-10 text-center">
                            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-muted text-txt-placeholder">
                                <Icon name="calendar-clock" size={24} />
                            </div>
                            <p className="text-sm font-semibold text-txt">Belum ada jadwal pesan</p>
                            <p className="mt-1 text-[13px] text-txt-muted">Buat jadwal untuk mengirim pesan otomatis.</p>
                            <Link to="./scheduled" className="mt-4">
                                <Button variant="secondary" size="sm" icon="plus">
                                    Buat Jadwal
                                </Button>
                            </Link>
                        </div>
                    </Card>
                ) : (
                    <Card className="divide-y divide-surface-divider">
                        {schedules.slice(0, 5).map((s) => (
                            <div key={s.id} className="flex items-center gap-3 px-5 py-3.5">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                                    <Icon name="calendar-clock" size={17} />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <div className="truncate text-sm font-semibold text-txt">{s.name}</div>
                                    <div className="truncate text-xs text-txt-muted">
                                        {s.recipients?.length || 0} penerima
                                        {s.next_run ? ` • Berikutnya: ${new Date(s.next_run).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}` : ""}
                                    </div>
                                </div>
                                <Badge variant={s.is_active ? "success" : "neutral"}>{s.is_active ? "Aktif" : "Nonaktif"}</Badge>
                            </div>
                        ))}
                    </Card>
                )}
            </section>
        </div>
    );
}
