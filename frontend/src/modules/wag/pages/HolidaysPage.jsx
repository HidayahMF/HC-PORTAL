import { useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";
import API from "../services/api";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Icon from "../components/ui/Icon";
import IconButton from "../components/ui/IconButton";
import Button from "../components/ui/Button";
import PageHeader from "../components/ui/PageHeader";
import Input from "../components/ui/Input";
import Select from "../components/ui/Select";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import DataTable from "../components/ui/DataTable";
import Skeleton from "../components/ui/Skeleton";
import ErrorState from "../components/ui/ErrorState";
import { can } from "../utils/permissions";
import { AuthContext } from "../context/AuthContext";

const MONTHS = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

function formatDate(dateStr) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export default function HolidaysPage() {
    const auth = useContext(AuthContext);
    const isOperator = can(auth.user, "operator");

    const [holidays, setHolidays] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [showForm, setShowForm] = useState(false);
    const [formDate, setFormDate] = useState("");
    const [formDesc, setFormDesc] = useState("");
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState("");

    const [bulkMode, setBulkMode] = useState(false);
    const [bulkYear, setBulkYear] = useState(new Date().getFullYear());
    const [bulkSaving, setBulkSaving] = useState(false);

    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const fetchHolidays = async () => {
        try {
            const res = await API.get("/holidays");
            setHolidays(res.data || []);
            setError("");
        } catch (err) {
            setError(err?.response?.data?.message || err.message || "Gagal memuat tanggal merah");
        }
    };

    const reloadHolidays = async () => {
        setLoading(true);
        try {
            await fetchHolidays();
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(reloadHolidays, 0);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function handleAdd() {
        setFormError("");
        if (!formDate) {
            setFormError("Pilih tanggal terlebih dahulu");
            return;
        }            setSaving(true);
        try {
            await API.post("/holidays", { holiday_date: formDate, description: formDesc || null });
            toast.success("Tanggal merah berhasil ditambahkan");
            setFormDate("");
            setFormDesc("");
            setShowForm(false);
            await fetchHolidays();
        } catch (err) {
            setFormError(err.response?.data?.message || "Gagal menambahkan");
        }
        setSaving(false);
    }

    async function handleDelete() {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await API.delete(`/holidays/${deleteTarget}`);
            setDeleteTarget(null);
            await fetchHolidays();
            toast.success("Tanggal merah berhasil dihapus");
        } catch (err) {
            toast.error(err?.response?.data?.message || "Gagal menghapus");
        }
        setDeleting(false);
    }

    async function handleBulkImport() {
        setBulkSaving(true);
        try {
            const dates = [];
            for (let month = 0; month < 12; month++) {
                const daysInMonth = new Date(bulkYear, month + 1, 0).getDate();
                for (let day = 1; day <= daysInMonth; day++) {
                    const date = new Date(bulkYear, month, day);
                    if (date.getDay() === 0 || date.getDay() === 6) {
                        const dateStr = `${bulkYear}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                        dates.push({ holiday_date: dateStr, description: date.getDay() === 0 ? "Minggu" : "Sabtu" });
                    }
                }
            }
            if (dates.length === 0) {
                toast.error("Tidak ada hari Sabtu/Minggu ditemukan");
                return;
            }
            const res = await API.post("/holidays/bulk", { holidays: dates });
            await fetchHolidays();
            toast.success(`Berhasil import: ${res.data.added} ditambahkan, ${res.data.skipped} sudah ada (skip)`);
        } catch (err) {
            toast.error(err?.response?.data?.message || "Gagal import");
        } finally {
            setBulkSaving(false);
        }
    }

    const filteredByYear = (holidays || []).filter((h) => {
        const d = new Date(h.holiday_date);
        return !isNaN(d.getTime()) && d.getFullYear() === bulkYear;
    });

    const years = getYearOptions(holidays || []);

    return (
        <div className="space-y-5">
            <PageHeader
                title="Tanggal Merah"
                description="Kelola hari libur untuk penjadwalan pesan"
                actions={
                    isOperator ? (
                        <>
                            <Button variant="secondary" icon="calendar-days" onClick={() => setBulkMode((v) => !v)}>
                                {bulkMode ? "Tutup Import" : "Import Sabtu/Minggu"}
                            </Button>
                            <Button icon="plus" onClick={() => { setShowForm((v) => !v); setFormError(""); }}>
                                Tambah Tanggal
                            </Button>
                        </>
                    ) : (
                        <span className="flex items-center gap-1.5 text-xs text-txt-muted">
                            <Icon name="lock" size={13} /> Mode hanya-lihat
                        </span>
                    )
                }
            />

            {/* Year filter */}
            <Card className="flex items-center gap-3 p-4">
                <Select
                    label="Tahun"
                    value={bulkYear}
                    onChange={(e) => setBulkYear(Number(e.target.value))}
                    options={years.map((y) => ({ value: y, label: String(y) }))}
                    className="w-36"
                />
                <p className="pt-5 text-[13px] text-txt-muted">
                    {filteredByYear.length} tanggal merah tahun {bulkYear}
                </p>
            </Card>

            {/* Bulk import */}
            {bulkMode && isOperator && (
                <Card className="p-5">
                    <h3 className="text-sm font-bold text-txt">Import Hari Sabtu & Minggu</h3>
                    <p className="mt-1 text-[13px] text-txt-muted">
                        Secara otomatis menambahkan semua hari Sabtu dan Minggu di tahun yang dipilih sebagai tanggal merah.
                    </p>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                        <div className="sm:w-36">
                            <Select
                                label="Tahun"
                                value={bulkYear}
                                onChange={(e) => setBulkYear(Number(e.target.value))}
                                options={[2025, 2026, 2027, 2028].map((y) => ({ value: y, label: String(y) }))}
                            />
                        </div>
                        <Button icon="calendar-days" loading={bulkSaving} onClick={handleBulkImport} className="sm:flex-1">
                            {bulkSaving ? "Mengimport..." : `Import Sabtu & Minggu ${bulkYear}`}
                        </Button>
                    </div>
                </Card>
            )}

            {/* Add form */}
            {showForm && isOperator && (
                <Card className="p-5">
                    <h3 className="mb-4 text-sm font-bold text-txt">Tambah Tanggal Merah</h3>
                    {formError && (
                        <div role="alert" className="mb-3 flex items-start gap-2 rounded-lg border border-red-200 bg-danger-soft px-3.5 py-2.5 text-[13px] font-medium text-danger">
                            <Icon name="alert-triangle" size={15} className="mt-0.5 shrink-0" />
                            {formError}
                        </div>
                    )}
                    <div className="grid gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-end">
                        <Input label="Tanggal" type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
                        <Input label="Keterangan (opsional)" placeholder="Contoh: Hari Raya Natal" value={formDesc} onChange={(e) => setFormDesc(e.target.value)} />
                        <div className="flex gap-2">
                            <Button icon="check" loading={saving} onClick={handleAdd}>
                                {saving ? "Menyimpan..." : "Simpan"}
                            </Button>
                            <Button variant="secondary" onClick={() => setShowForm(false)}>
                                Batal
                            </Button>
                        </div>
                    </div>
                </Card>
            )}

            {/* Table */}
            {loading ? (
                <Card className="p-5">
                    <div className="space-y-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton key={i} className="h-11 rounded-xl" />
                        ))}
                    </div>
                </Card>
            ) : error ? (
                <Card>
                    <ErrorState title="Gagal memuat tanggal merah" description={error} onRetry={reloadHolidays} />
                </Card>
            ) : (
                <DataTable
                    rows={filteredByYear}
                    rowKey={(h) => h.id}
                    minWidth={560}
                    emptyIcon="calendar-days"
                    emptyTitle="Belum ada tanggal merah"
                    emptyDescription={`Klik "Tambah Tanggal" atau "Import Sabtu/Minggu" untuk menambahkan hari libur tahun ${bulkYear}.`}
                    columns={[
                        {
                            key: "tanggal",
                            header: "Tanggal",
                            render: (h) => (
                                <div className="flex items-center gap-2.5">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                                        <Icon name="calendar-days" size={17} />
                                    </span>
                                    <span className="text-sm font-semibold text-txt">{formatDate(h.holiday_date)}</span>
                                </div>
                            ),
                        },
                        {
                            key: "hari",
                            header: "Hari",
                            render: (h) => {
                                const d = new Date(h.holiday_date);
                                const isWeekend = !isNaN(d.getTime()) && (d.getDay() === 0 || d.getDay() === 6);
                                return <Badge variant={isWeekend ? "neutral" : "warning"}>{DAYS[d.getDay()]}</Badge>;
                            },
                        },
                        { key: "description", header: "Keterangan", render: (h) => <span className="text-[13px] text-txt-secondary">{h.description || "-"}</span> },
                        {
                            key: "actions",
                            header: "Aksi",
                            headerClassName: "text-right",
                            className: "text-right",
                            render: (h) =>
                                isOperator ? (
                                    <IconButton icon="trash" label={`Hapus ${formatDate(h.holiday_date)}`} variant="danger" onClick={() => setDeleteTarget(h.id)} />
                                ) : (
                                    <span className="text-txt-placeholder">—</span>
                                ),
                        },
                    ]}
                />
            )}

            <ConfirmDialog
                open={!!deleteTarget}
                title="Hapus Tanggal Merah"
                message="Yakin ingin menghapus tanggal merah ini? Tindakan ini tidak dapat dibatalkan."
                confirmLabel="Hapus"
                loading={deleting}
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    );
}

function getYearOptions(holidays) {
    const years = new Set([new Date().getFullYear()]);
    holidays.forEach((h) => {
        const d = new Date(h.holiday_date);
        if (!isNaN(d.getTime())) years.add(d.getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a);
}
