import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchAllSimEmployees } from "../services/monitoring";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import IconButton from "../components/ui/IconButton";
import PageHeader from "../components/ui/PageHeader";
import StatCard from "../components/ui/StatCard";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import DataTable from "../components/ui/DataTable";
import ErrorState from "../components/ui/ErrorState";
import Avatar from "../components/Avatar";

function getSimStatus(sisaHari) {
    if (sisaHari == null) return null;
    if (sisaHari < 0) return { label: "Expired", variant: "danger" };
    if (sisaHari <= 7) return { label: "Kritis", variant: "danger" };
    if (sisaHari <= 14) return { label: "Mendesak", variant: "warning" };
    if (sisaHari <= 30) return { label: "Perlu Diperhatikan", variant: "info" };
    return { label: "Aman", variant: "success" };
}

const STATUS_FILTERS = [
    { key: "all", label: "Semua" },
    { key: "expired", label: "Expired" },
    { key: "kritis", label: "Kritis" },
    { key: "mendesak", label: "Mendesak" },
    { key: "perhatian", label: "Perlu Diperhatikan" },
    { key: "aman", label: "Aman" },
];

function minSisa(emp) {
    return Math.min(...[emp.simc?.sisa_hari, emp.sima?.sisa_hari].filter((n) => n != null));
}

function matchesStatus(min, key) {
    if (min == null) return false;
    switch (key) {
        case "expired":
            return min < 0;
        case "kritis":
            return min >= 0 && min <= 7;
        case "mendesak":
            return min >= 8 && min <= 14;
        case "perhatian":
            return min >= 15 && min <= 30;
        case "aman":
            return min > 30;
        default:
            return true;
    }
}

export default function MonitoringSimPage() {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [simFilter, setSimFilter] = useState("all");
    const [divisiFilter, setDivisiFilter] = useState("all");
    const [sortKey, setSortKey] = useState("sisa");

    const fetchAll = useCallback(async () => {
        // Ambil semua halaman pagination agar dataset lengkap (bukan cuma 50 pertama).
        const rows = await fetchAllSimEmployees();

        return rows.map((r) => ({
            key: `${r.nama}|${r.divisi || ""}|${r.no_hp || ""}`,
            nama: r.nama,
            divisi: r.divisi || "",
            no_hp: r.no_hp || "",
            simc: r.simc_sisa != null ? { tgl: r.simc_tgl, sisa_hari: r.simc_sisa } : null,
            sima: r.sima_sisa != null ? { tgl: r.sima_tgl, sisa_hari: r.sima_sisa } : null,
        }));
    }, []);

    useEffect(() => {
        let cancelled = false;
        fetchAll()
            .then((merged) => {
                if (!cancelled) setEmployees(merged);
            })
            .catch((err) => {
                if (cancelled) return;
                setError(err?.response?.data?.message || err.message || "Gagal memuat data monitoring");
                setEmployees([]);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [fetchAll]);

    const handleRefresh = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const merged = await fetchAll();
            setEmployees(merged);
        } catch (err) {
            setError(err?.response?.data?.message || err.message || "Gagal memuat data monitoring");
            setEmployees([]);
        }
        setLoading(false);
    }, [fetchAll]);

    const stats = useMemo(() => {
        let expired = 0,
            kritis = 0,
            mendesak = 0,
            perhatian = 0,
            aman = 0,
            tanpa = 0;
        employees.forEach((e) => {
            const min = minSisa(e);
            if (min == null) {
                tanpa += 1;
                return;
            }
            if (min < 0) expired++;
            else if (min <= 7) kritis++;
            else if (min <= 14) mendesak++;
            else if (min <= 30) perhatian++;
            else aman++;
        });
        return { total: employees.length, expired, kritis, mendesak, perhatian, aman, tanpa };
    }, [employees]);

    const divisions = useMemo(() => {
        const d = new Set();
        for (const e of employees) if (e.divisi) d.add(e.divisi);
        return Array.from(d).sort((a, b) => a.localeCompare(b));
    }, [employees]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        const rows = employees.filter((e) => {
            if (!matchesStatus(minSisa(e), statusFilter)) return false;
            if (simFilter === "simc" && !e.simc) return false;
            if (simFilter === "sima" && !e.sima) return false;
            if (divisiFilter !== "all" && e.divisi !== divisiFilter) return false;
            if (!q) return true;
            return e.nama.toLowerCase().includes(q) || e.divisi.toLowerCase().includes(q) || e.no_hp.includes(q);
        });

        return rows.sort((a, b) => {
            if (sortKey === "nama") return a.nama.localeCompare(b.nama);
            if (sortKey === "divisi") return a.divisi.localeCompare(b.divisi);
            return (minSisa(a) ?? 99999) - (minSisa(b) ?? 99999);
        });
    }, [employees, search, statusFilter, simFilter, divisiFilter, sortKey]);

    const statTone = { all: "brand", expired: "danger", kritis: "danger", mendesak: "warning", perhatian: "info", aman: "success" };

    function SimCell({ sim }) {
        if (!sim) return <span className="text-txt-placeholder">-</span>;
        const st = getSimStatus(sim.sisa_hari);
        return (
            <div className="flex flex-col gap-1">
                <span className="font-mono text-[13px] text-txt-secondary">{sim.tgl}</span>
                <span>
                    <Badge variant={st.variant}>{st.label}</Badge>
                </span>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <PageHeader
                title="Monitoring SIM"
                description="Pantau masa berlaku SIM A & SIM C seluruh karyawan"
                actions={
                    <IconButton icon="refresh" label="Segarkan data" variant="outline" onClick={handleRefresh} disabled={loading} />
                }
            />

            {/* Stat cards = filter */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {STATUS_FILTERS.map((f) => {
                    const value = f.key === "all" ? stats.total : stats[f.key];
                    return (
                        <StatCard
                            key={f.key}
                            label={f.label}
                            value={value}
                            tone={statTone[f.key]}
                            active={statusFilter === f.key}
                            onClick={() => setStatusFilter(f.key)}
                        />
                    );
                })}
            </div>

            {/* Filter & sort */}
            <Card className="p-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="lg:col-span-1">
                        <Input
                            label="Cari"
                            icon="search"
                            placeholder="Nama, divisi, atau No. HP"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full"
                        />
                    </div>
                    <Select
                        label="Jenis SIM"
                        value={simFilter}
                        onChange={(e) => setSimFilter(e.target.value)}
                        options={[
                            { value: "all", label: "Semua" },
                            { value: "simc", label: "SIM C" },
                            { value: "sima", label: "SIM A" },
                        ]}
                    />
                    <Select
                        label="Divisi"
                        value={divisiFilter}
                        onChange={(e) => setDivisiFilter(e.target.value)}
                        options={[{ value: "all", label: "Semua Divisi" }, ...divisions.map((d) => ({ value: d, label: d }))]}
                    />
                    <Select
                        label="Urutkan"
                        value={sortKey}
                        onChange={(e) => setSortKey(e.target.value)}
                        options={[
                            { value: "sisa", label: "Sisa hari (terdekat)" },
                            { value: "nama", label: "Nama (A-Z)" },
                            { value: "divisi", label: "Divisi" },
                        ]}
                    />
                </div>
            </Card>

            {error && <ErrorState title="Gagal memuat data" description={error} onRetry={handleRefresh} />}

            {!error && (
                <DataTable
                    loading={loading}
                    rows={filtered}
                    rowKey={(r) => r.key}
                    minWidth={860}
                    emptyIcon="users"
                    emptyTitle={employees.length === 0 ? "Belum ada data karyawan" : "Karyawan tidak ditemukan"}
                    emptyDescription={
                        employees.length === 0
                            ? "Tidak ada karyawan aktif dengan tanggal SIM A / SIM C."
                            : "Tidak ada yang cocok dengan filter atau pencarian Anda."
                    }
                    footer={
                        <div className="flex items-center justify-between">
                            <span className="text-[13px] text-txt-muted">{filtered.length} karyawan</span>
                            <span className="text-[13px] text-txt-muted">
                                {stats.expired} expired • {stats.kritis + stats.mendesak} mendesak/kritis
                            </span>
                        </div>
                    }
                    columns={[
                        {
                            key: "nama",
                            header: "Karyawan",
                            className: "min-w-[220px]",
                            render: (e) => (
                                <div className="flex items-center gap-3">
                                    <Avatar name={e.nama} size={32} />
                                    <div className="min-w-0">
                                        <div className="truncate text-sm font-semibold text-txt">{e.nama}</div>
                                        <div className="truncate font-mono text-xs text-txt-muted">{e.no_hp || "-"}</div>
                                    </div>
                                </div>
                            ),
                        },
                        { key: "divisi", header: "Divisi", render: (e) => <span className="text-[13px] text-txt-secondary">{e.divisi || "-"}</span> },
                        { key: "simc", header: "SIM C", render: (e) => <SimCell sim={e.simc} /> },
                        { key: "sima", header: "SIM A", render: (e) => <SimCell sim={e.sima} /> },
                        {
                            key: "status",
                            header: "Status",
                            render: (e) => {
                                const st = getSimStatus(minSisa(e));
                                return st ? <Badge variant={st.variant} dot>{st.label}</Badge> : <span className="text-txt-placeholder">-</span>;
                            },
                        },
                        {
                            key: "sisa",
                            header: "Sisa Hari",
                            render: (e) => {
                                const min = minSisa(e);
                                if (min == null) return <span className="text-txt-placeholder">-</span>;
                                const st = getSimStatus(min);
                                return <span className={`font-mono text-[13px] font-semibold ${st.variant === "danger" ? "text-danger" : st.variant === "warning" ? "text-warning" : st.variant === "info" ? "text-info" : "text-success"}`}>{min} hari</span>;
                            },
                        },
                    ]}
                />
            )}
        </div>
    );
}
