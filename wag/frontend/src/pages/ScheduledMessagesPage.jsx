import { useContext, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import API from "../services/api";
import Avatar from "../components/Avatar";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Icon from "../components/ui/Icon";
import IconButton from "../components/ui/IconButton";
import Button from "../components/ui/Button";
import PageHeader from "../components/ui/PageHeader";
import Input from "../components/ui/Input";
import Textarea from "../components/ui/Textarea";
import Select from "../components/ui/Select";
import Checkbox from "../components/ui/Checkbox";
import Toggle from "../components/ui/Toggle";
import Modal from "../components/ui/Modal";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import DataTable from "../components/ui/DataTable";
import Skeleton from "../components/ui/Skeleton";
import ErrorState from "../components/ui/ErrorState";
import { MAX_FILE_BYTES, getFileKind, ALLOWED_MIME } from "../utils/fileUtils";
import { can } from "../utils/permissions";
import { AuthContext } from "../context/AuthContext";

const MONTHS = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function buildCron(schedule) {
    const { type, interval, hour, minute, dayOfMonth, month } = schedule;
    const min = minute ?? 0;
    const hr = hour ?? 0;
    if (type === "every_x_hours") return `${min} */${interval || 1} * * *`;
    if (type === "daily") return `${min} ${hr} * * *`;
    if (type === "working_days") return `${min} ${hr} * * 1-5`;
    if (type === "specific_date") return `${min} ${hr} ${dayOfMonth || 1} ${month || 1} *`;
    return `${min} ${hr} * * *`;
}

function parseCronToSchedule(expr) {
    if (!expr) return { type: "daily", interval: 1, hour: 8, minute: 0, dayOfMonth: 1, month: 1 };
    const parts = expr.split(" ");
    if (parts.length !== 5) return { type: "daily", interval: 1, hour: 8, minute: 0, dayOfMonth: 1, month: 1 };
    const [min, hour, dom, month, dow] = parts;
    const minute = min === "*" ? 0 : parseInt(min, 10);
    const h = hour === "*" ? 0 : parseInt(hour, 10);
    if (hour.startsWith("*/")) return { type: "every_x_hours", interval: parseInt(hour.slice(2), 10), hour: 0, minute, dayOfMonth: 1, month: 1 };
    if (dow === "1-5") return { type: "working_days", interval: 1, hour: h, minute, dayOfMonth: 1, month: 1 };
    if (dom !== "*") return { type: "specific_date", interval: 1, hour: h, minute, dayOfMonth: parseInt(dom, 10), month: parseInt(month, 10) };
    return { type: "daily", interval: 1, hour: h, minute, dayOfMonth: 1, month: 1 };
}

function describeSchedule(schedule) {
    const { type, interval, hour, minute, dayOfMonth, month } = schedule;
    const hr = String(hour ?? 0).padStart(2, "0");
    const mn = String(minute ?? 0).padStart(2, "0");
    const time = `${hr}:${mn}`;
    if (type === "every_x_hours") return `Setiap ${interval || 1} jam sekali`;
    if (type === "daily") return `Setiap hari jam ${time}`;
    if (type === "working_days") return `Hari kerja (Senin-Jumat) jam ${time}`;
    if (type === "specific_date") return `Tanggal ${dayOfMonth} ${MONTHS[(month || 1) - 1]} jam ${time}`;
    return "-";
}

function getFileNameFromPath(fp) {
    if (!fp) return "";
    return fp.split(/[\\/]/).pop();
}

function formatDate(dateStr) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? "-" : d.toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const hours = Array.from({ length: 24 }, (_, i) => i);
const minutes = Array.from({ length: 60 }, (_, i) => i);
const days = Array.from({ length: 31 }, (_, i) => i + 1);
const intervals = [1, 2, 3, 4, 6, 8, 12];

const SCHEDULE_TYPES = [
    { key: "every_x_hours", label: "Setiap X Jam" },
    { key: "daily", label: "Setiap Hari" },
    { key: "working_days", label: "Hari Kerja" },
    { key: "specific_date", label: "Tanggal Tertentu" },
];

const EMPTY_CONFIG = { interval: 1, hour: 8, minute: 0, dayOfMonth: 1, month: 1 };

export default function ScheduledMessagesPage() {
    const auth = useContext(AuthContext);
    const isOperator = can(auth.user, "operator");

    const [schedules, setSchedules] = useState(null);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({ name: "", message: "", is_active: true, only_working_days: false });
    const [scheduleType, setScheduleType] = useState("daily");
    const [scheduleConfig, setScheduleConfig] = useState({ ...EMPTY_CONFIG });
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
    const [employeeSearch, setEmployeeSearch] = useState("");
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState("");

    const [file, setFile] = useState(null);
    const [fileError, setFileError] = useState("");
    const [filePreviewUrl, setFilePreviewUrl] = useState(null);
    const [existingFile, setExistingFile] = useState(null);
    const [removeExistingFile, setRemoveExistingFile] = useState(false);
    const fileInputRef = useRef(null);

    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const loadData = async () => {
        setLoading(true);
        setError("");
        try {
            const [schedRes, empRes] = await Promise.all([API.get("/scheduled-messages"), API.get("/broadcast/employees")]);
            setSchedules(schedRes.data || []);
            setEmployees(empRes.data || []);
        } catch (err) {
            setError(err?.response?.data?.message || err.message || "Gagal memuat data jadwal");
        }
        setLoading(false);
    };

    useEffect(() => {
        const timer = setTimeout(loadData, 0);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (!filePreviewUrl) return undefined;
        return () => URL.revokeObjectURL(filePreviewUrl);
    }, [filePreviewUrl]);

    const filteredEmployees = useMemo(() => {
        const q = employeeSearch.toLowerCase();
        if (!q) return employees;
        return employees.filter((e) => e.nama?.toLowerCase().includes(q) || e.nip?.toLowerCase().includes(q) || e.no_hp?.includes(q));
    }, [employees, employeeSearch]);

    function openCreateForm() {
        setEditingId(null);
        setForm({ name: "", message: "", is_active: true, only_working_days: false });
        setScheduleType("daily");
        setScheduleConfig({ ...EMPTY_CONFIG });
        setSelectedEmployeeIds([]);
        setEmployeeSearch("");
        setFormError("");
        resetFileState();
        setShowForm(true);
    }

    function openEditForm(schedule) {
        setEditingId(schedule.id);
        setForm({ name: schedule.name, message: schedule.message, is_active: !!schedule.is_active, only_working_days: !!schedule.only_working_days });
        const parsed = parseCronToSchedule(schedule.cron_expression);
        setScheduleType(parsed.type);
        setScheduleConfig({ interval: parsed.interval, hour: parsed.hour, minute: parsed.minute, dayOfMonth: parsed.dayOfMonth, month: parsed.month });
        setSelectedEmployeeIds(schedule.recipients?.map((r) => r.id) || []);
        setEmployeeSearch("");
        setFormError("");
        resetFileState();
        setExistingFile(schedule.file_path ? { path: schedule.file_path, mimetype: schedule.file_mimetype } : null);
        setShowForm(true);
    }

    function resetFileState() {
        if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
        setFilePreviewUrl(null);
        setFile(null);
        setFileError("");
        setExistingFile(null);
        setRemoveExistingFile(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }

    function closeForm() {
        setShowForm(false);
        setEditingId(null);
        setFormError("");
        resetFileState();
    }

    function onPickFile(pickedFile) {
        setFileError("");
        if (!pickedFile) return;
        if (pickedFile.size > MAX_FILE_BYTES) {
            setFileError("Ukuran file maksimal 16MB.");
            return;
        }
        if (!ALLOWED_MIME.has(pickedFile.type)) {
            setFileError("Tipe file tidak didukung. JPG/PNG/WEBP, MP4, MP3, PDF.");
            return;
        }
        if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
        const kind = getFileKind(pickedFile);
        setFilePreviewUrl(kind === "image" ? URL.createObjectURL(pickedFile) : null);
        setFile(pickedFile);
        setExistingFile(null);
        setRemoveExistingFile(false);
    }

    function toggleEmployeeSelection(empId) {
        setSelectedEmployeeIds((prev) => (prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]));
    }

    function toggleSelectAll() {
        const filteredIds = filteredEmployees.map((e) => e.id);
        const allSelected = filteredIds.every((id) => selectedEmployeeIds.includes(id));
        if (allSelected) setSelectedEmployeeIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
        else setSelectedEmployeeIds((prev) => [...new Set([...prev, ...filteredIds])]);
    }

    async function handleSave() {
        setFormError("");
        if (!form.name.trim()) {
            setFormError("Nama jadwal wajib diisi");
            return;
        }
        if (!form.message.trim()) {
            setFormError("Isi pesan wajib diisi");
            return;
        }
        if (selectedEmployeeIds.length === 0) {
            setFormError("Pilih minimal 1 penerima");
            return;
        }
        if (fileError) {
            setFormError(fileError);
            return;
        }

        const cronExpr = buildCron({ type: scheduleType, ...scheduleConfig });
        const selectedRecipients = employees
            .filter((e) => selectedEmployeeIds.includes(e.id))
            .map((e) => ({ id: e.id, nama: e.nama, no_hp: e.no_hp }));

        setSaving(true);
        try {
            const hasNewFile = !!file;
            const shouldRemoveFile = removeExistingFile && !hasNewFile;

            if (hasNewFile) {
                const fd = new FormData();
                fd.append("name", form.name.trim());
                fd.append("message", form.message.trim());
                fd.append("recipients", JSON.stringify(selectedRecipients));
                fd.append("cron_expression", cronExpr);
                fd.append("is_active", form.is_active);
                fd.append("only_working_days", form.only_working_days);
                fd.append("file", file);
                if (editingId) await API.put(`/scheduled-messages/${editingId}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
                else await API.post("/scheduled-messages", fd, { headers: { "Content-Type": "multipart/form-data" } });
            } else {
                const payload = {
                    name: form.name.trim(),
                    message: form.message.trim(),
                    recipients: selectedRecipients,
                    cron_expression: cronExpr,
                    is_active: form.is_active,
                    only_working_days: form.only_working_days,
                };
                if (shouldRemoveFile) payload.remove_file = true;
                if (editingId) await API.put(`/scheduled-messages/${editingId}`, payload);
                else await API.post("/scheduled-messages", payload);
            }
            closeForm();
            await loadData();
            toast.success(editingId ? "Jadwal berhasil diperbarui" : "Jadwal berhasil dibuat");
        } catch (err) {
            setFormError(err.response?.data?.message || "Gagal menyimpan jadwal");
        }
        setSaving(false);
    }

    async function handleDelete() {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await API.delete(`/scheduled-messages/${deleteTarget}`);
            setDeleteTarget(null);
            await loadData();
            toast.success("Jadwal berhasil dihapus");
        } catch (err) {
            toast.error(err?.response?.data?.message || "Gagal menghapus jadwal");
        }
        setDeleting(false);
    }

    async function handleToggle(schedule) {
        try {
            await API.patch(`/scheduled-messages/${schedule.id}/toggle`);
            await loadData();
            toast.success(schedule.is_active ? "Jadwal dinonaktifkan" : "Jadwal diaktifkan");
        } catch (err) {
            toast.error(err?.response?.data?.message || "Gagal mengubah status jadwal");
        }
    }

    const previewDescription = describeSchedule({ type: scheduleType, ...scheduleConfig });
    const previewMessage = form.message;
    const previewHasFile = !!(file || (existingFile && !removeExistingFile));
    const previewFileName = file?.name || (existingFile && !removeExistingFile ? getFileNameFromPath(existingFile.path) : "");
    const previewFileKind = file
        ? getFileKind(file)
        : existingFile && !removeExistingFile
          ? (() => {
                const m = existingFile.mimetype || "";
                if (m.startsWith("image/")) return "image";
                if (m === "application/pdf") return "pdf";
                if (m.startsWith("video/")) return "video";
                if (m.startsWith("audio/")) return "audio";
                return "other";
            })()
          : null;

    return (
        <div className="space-y-5">
            <PageHeader
                title="Jadwal Pesan"
                description="Kelola pesan otomatis berdasarkan jadwal"
                actions={
                    isOperator ? (
                        <Button icon="plus" onClick={openCreateForm}>
                            Buat Jadwal
                        </Button>
                    ) : (
                        <span className="flex items-center gap-1.5 text-xs text-txt-muted">
                            <Icon name="lock" size={13} /> Mode hanya-lihat
                        </span>
                    )
                }
            />

            {loading ? (
                <Card className="p-5">
                    <div className="space-y-3">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-14 rounded-xl" />
                        ))}
                    </div>
                </Card>
            ) : error ? (
                <Card>
                    <ErrorState title="Gagal memuat jadwal" description={error} onRetry={loadData} />
                </Card>
            ) : (
                <DataTable
                    rows={schedules || []}
                    rowKey={(s) => s.id}
                    minWidth={920}
                    emptyIcon="calendar-clock"
                    emptyTitle="Belum ada jadwal"
                    emptyDescription={'Klik "Buat Jadwal" untuk menambah jadwal pesan otomatis.'}
                    emptyAction={isOperator ? <Button icon="plus" onClick={openCreateForm}>Buat Jadwal</Button> : null}
                    footer={<span className="text-[13px] text-txt-muted">{schedules?.length || 0} jadwal</span>}
                    columns={[
                        {
                            key: "name",
                            header: "Nama",
                            className: "min-w-[200px]",
                            render: (s) => (
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="truncate text-sm font-semibold text-txt">{s.name}</span>
                                        {s.file_path && <Icon name="paperclip" size={14} className="shrink-0 text-txt-muted" title="Ada lampiran" />}
                                    </div>
                                    <div className="mt-1 line-clamp-2 max-w-[280px] whitespace-pre-wrap text-xs text-txt-muted">{s.message}</div>
                                </div>
                            ),
                        },
                        {
                            key: "schedule",
                            header: "Jadwal",
                            render: (s) => <span className="text-[13px] text-txt-secondary">{describeSchedule(parseCronToSchedule(s.cron_expression))}</span>,
                        },
                        { key: "recipients", header: "Penerima", render: (s) => <span className="text-[13px] text-txt-secondary">{s.recipients?.length || 0}</span> },
                        {
                            key: "flags",
                            header: "Ketentuan",
                            render: (s) => (
                                <div className="flex flex-wrap gap-1">
                                    {s.only_working_days && <Badge variant="info">Hari Kerja</Badge>}
                                    {s.file_path && <Badge variant="warning">Lampiran</Badge>}
                                    {!s.only_working_days && !s.file_path && <span className="text-txt-placeholder">-</span>}
                                </div>
                            ),
                        },
                        {
                            key: "status",
                            header: "Status",
                            render: (s) => <Badge variant={s.is_active ? "success" : "neutral"} dot>{s.is_active ? "Aktif" : "Nonaktif"}</Badge>,
                        },
                        {
                            key: "last_run",
                            header: "Terakhir",
                            render: (s) => <span className="whitespace-nowrap font-mono text-xs text-txt-muted">{formatDate(s.last_run)}</span>,
                        },
                        {
                            key: "next_run",
                            header: "Berikutnya",
                            render: (s) => <span className="whitespace-nowrap font-mono text-xs text-txt-secondary">{formatDate(s.next_run)}</span>,
                        },
                        {
                            key: "actions",
                            header: "Aksi",
                            headerClassName: "text-right",
                            className: "text-right whitespace-nowrap",
                            render: (s) => (
                                <div className="inline-flex items-center gap-1.5">
                                    {isOperator && (
                                        <Toggle
                                            checked={!!s.is_active}
                                            onChange={() => handleToggle(s)}
                                            aria-label={`${s.is_active ? "Nonaktifkan" : "Aktifkan"} ${s.name}`}
                                            title={s.is_active ? "Nonaktifkan" : "Aktifkan"}
                                        />
                                    )}
                                    {isOperator && (
                                        <IconButton icon="edit" label={`Edit ${s.name}`} variant="outline" onClick={() => openEditForm(s)} />
                                    )}
                                    {isOperator && (
                                        <IconButton icon="trash" label={`Hapus ${s.name}`} variant="danger" onClick={() => setDeleteTarget(s.id)} />
                                    )}
                                    {!isOperator && <span className="text-txt-placeholder">—</span>}
                                </div>
                            ),
                        },
                    ]}
                />
            )}

            {/* Form modal */}
            <Modal
                open={showForm}
                onClose={closeForm}
                title={editingId ? "Edit Jadwal" : "Buat Jadwal Baru"}
                size="xl"
                footer={
                    <>
                        <Button variant="secondary" onClick={closeForm} disabled={saving}>
                            Batal
                        </Button>
                        <Button onClick={handleSave} loading={saving} icon="check">
                            {saving ? "Menyimpan..." : editingId ? "Simpan Perubahan" : "Buat Jadwal"}
                        </Button>
                    </>
                }
            >
                <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
                    <div className="min-w-0 space-y-4">
                        {formError && (
                            <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-danger-soft px-3.5 py-2.5 text-[13px] font-medium text-danger">
                                <Icon name="alert-triangle" size={15} className="mt-0.5 shrink-0" />
                                {formError}
                            </div>
                        )}

                        <Input
                            label="Nama Jadwal"
                            placeholder="Contoh: Pesan Harian 8 Pagi"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                        />

                        <Textarea
                            label="Isi Pesan"
                            rows={4}
                            placeholder="Tulis pesan yang akan dikirim..."
                            value={form.message}
                            maxLength={4000}
                            charCount={form.message.length}
                            onChange={(e) => setForm({ ...form, message: e.target.value })}
                        />

                        {/* Attachment */}
                        <div>
                            <div className="mb-2 flex items-center justify-between gap-3">
                                <div>
                                    <div className="text-[13px] font-medium text-txt-secondary">Lampiran (opsional)</div>
                                    <div className="mt-0.5 text-xs text-txt-muted">Max 16MB - JPG/PNG/WEBP, MP4, MP3, PDF</div>
                                </div>
                                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,audio/mpeg,application/pdf" className="hidden" onChange={(e) => onPickFile(e.target.files?.[0])} />
                                <Button variant="secondary" size="sm" icon="paperclip" onClick={() => fileInputRef.current?.click()} disabled={saving}>
                                    Pilih File
                                </Button>
                            </div>

                            {fileError && <div className="mb-2 rounded-lg border border-red-200 bg-danger-soft px-3 py-2 text-xs font-semibold text-danger">{fileError}</div>}

                            {file && (
                                <div className="mb-2 flex items-center justify-between gap-3 rounded-xl bg-surface-muted p-3">
                                    <div className="flex min-w-0 items-center gap-3">
                                        {getFileKind(file) === "image" && filePreviewUrl ? (
                                            <img src={filePreviewUrl} alt="Pratinjau lampiran" className="h-11 w-11 rounded-lg border border-surface-border object-cover" />
                                        ) : (
                                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white text-txt-secondary">
                                                <Icon name={getFileKind(file) === "pdf" ? "file" : getFileKind(file) === "video" ? "video" : getFileKind(file) === "audio" ? "audio" : "paperclip"} size={20} />
                                            </span>
                                        )}
                                        <div className="min-w-0">
                                            <div className="truncate text-xs font-bold text-txt">{file.name}</div>
                                            <div className="text-[11px] text-txt-muted">{(file.size / (1024 * 1024)).toFixed(2)} MB</div>
                                        </div>
                                    </div>
                                    <IconButton icon="trash" label="Hapus lampiran" variant="danger" onClick={resetFileState} disabled={saving} />
                                </div>
                            )}

                            {!file && existingFile && !removeExistingFile && (
                                <div className="mb-2 flex items-center justify-between gap-3 rounded-xl bg-warning-soft p-3">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white text-warning">
                                            <Icon name="paperclip" size={20} />
                                        </span>
                                        <div className="min-w-0">
                                            <div className="truncate text-xs font-bold text-warning">{getFileNameFromPath(existingFile.path)}</div>
                                            <div className="text-[11px] text-warning/80">File saat ini</div>
                                        </div>
                                    </div>
                                    <div className="flex shrink-0 gap-1.5">
                                        <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()} disabled={saving}>
                                            Ganti
                                        </Button>
                                        <Button variant="danger-outline" size="sm" onClick={() => setRemoveExistingFile(true)} disabled={saving}>
                                            Hapus
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {!file && existingFile && removeExistingFile && (
                                <div className="mb-2 flex items-center justify-between rounded-xl bg-danger-soft px-3 py-2.5">
                                    <span className="text-xs font-medium text-danger">File akan dihapus saat disimpan</span>
                                    <Button variant="secondary" size="sm" onClick={() => setRemoveExistingFile(false)}>
                                        Batal
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Schedule */}
                        <div>
                            <div className="mb-2 text-[13px] font-medium text-txt-secondary">Jadwal Pengiriman</div>
                            <div className="mb-3.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                                {SCHEDULE_TYPES.map(({ key, label }) => (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => setScheduleType(key)}
                                        aria-pressed={scheduleType === key}
                                        className={`rounded-lg border px-2 py-2 text-xs font-semibold transition-all duration-150 ${
                                            scheduleType === key
                                                ? "border-brand bg-brand text-white"
                                                : "border-surface-border bg-white text-txt-secondary hover:bg-surface-muted"
                                        }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>

                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                {scheduleType === "every_x_hours" && (
                                    <>
                                        <Select label="Setiap" value={scheduleConfig.interval} onChange={(e) => setScheduleConfig({ ...scheduleConfig, interval: Number(e.target.value) })} options={intervals.map((n) => ({ value: n, label: `${n} jam` }))} />
                                        <Select label="Menit" value={scheduleConfig.minute} onChange={(e) => setScheduleConfig({ ...scheduleConfig, minute: Number(e.target.value) })} options={minutes.map((n) => ({ value: n, label: String(n).padStart(2, "0") }))} />
                                    </>
                                )}
                                {(scheduleType === "daily" || scheduleType === "working_days") && (
                                    <>
                                        <Select label="Jam" value={scheduleConfig.hour} onChange={(e) => setScheduleConfig({ ...scheduleConfig, hour: Number(e.target.value) })} options={hours.map((n) => ({ value: n, label: String(n).padStart(2, "0") }))} />
                                        <Select label="Menit" value={scheduleConfig.minute} onChange={(e) => setScheduleConfig({ ...scheduleConfig, minute: Number(e.target.value) })} options={minutes.map((n) => ({ value: n, label: String(n).padStart(2, "0") }))} />
                                    </>
                                )}
                                {scheduleType === "specific_date" && (
                                    <>
                                        <Select label="Tanggal" value={scheduleConfig.dayOfMonth} onChange={(e) => setScheduleConfig({ ...scheduleConfig, dayOfMonth: Number(e.target.value) })} options={days.map((n) => ({ value: n, label: String(n) }))} />
                                        <Select label="Bulan" value={scheduleConfig.month} onChange={(e) => setScheduleConfig({ ...scheduleConfig, month: Number(e.target.value) })} options={MONTHS.map((name, i) => ({ value: i + 1, label: name }))} />
                                        <Select label="Jam" value={scheduleConfig.hour} onChange={(e) => setScheduleConfig({ ...scheduleConfig, hour: Number(e.target.value) })} options={hours.map((n) => ({ value: n, label: String(n).padStart(2, "0") }))} />
                                        <Select label="Menit" value={scheduleConfig.minute} onChange={(e) => setScheduleConfig({ ...scheduleConfig, minute: Number(e.target.value) })} options={minutes.map((n) => ({ value: n, label: String(n).padStart(2, "0") }))} />
                                    </>
                                )}
                            </div>

                            <div className="mt-3 rounded-lg bg-info-soft px-3 py-2 text-xs font-medium text-info">{previewDescription}</div>

                            {scheduleType !== "working_days" && (
                                <div className="mt-3 flex items-center justify-between rounded-xl bg-surface-muted px-4 py-3">
                                    <div>
                                        <div className="text-[13px] font-semibold text-txt">Hanya Hari Kerja</div>
                                        <div className="text-xs text-txt-muted">Skip Sabtu/Minggu & tanggal merah</div>
                                    </div>
                                    <Toggle checked={form.only_working_days} onChange={(v) => setForm({ ...form, only_working_days: v })} />
                                </div>
                            )}
                            {scheduleType === "working_days" && (
                                <div className="mt-3 rounded-lg bg-success-soft px-3 py-2 text-xs font-medium text-success">
                                    Hanya dikirim Senin-Jumat. Tanggal merah juga di-skip.
                                </div>
                            )}
                        </div>

                        {/* Recipients */}
                        <div>
                            <div className="mb-2 flex items-center justify-between">
                                <div className="text-[13px] font-medium text-txt-secondary">Penerima ({selectedEmployeeIds.length} dipilih)</div>
                                <button type="button" onClick={toggleSelectAll} className="text-xs font-semibold text-brand hover:underline">
                                    {filteredEmployees.length > 0 && filteredEmployees.every((e) => selectedEmployeeIds.includes(e.id)) ? "Hapus semua" : `Pilih semua (${filteredEmployees.length})`}
                                </button>
                            </div>
                            <Input icon="search" placeholder="Cari nama, NIP, atau no HP..." value={employeeSearch} onChange={(e) => setEmployeeSearch(e.target.value)} className="mb-2" />
                            <div className="max-h-[240px] overflow-y-auto rounded-xl border border-surface-border">
                                {filteredEmployees.length === 0 ? (
                                    <div className="px-4 py-6 text-center text-sm text-txt-muted">Tidak ada karyawan ditemukan</div>
                                ) : (
                                    <ul className="divide-y divide-surface-divider">
                                        {filteredEmployees.map((emp) => {
                                            const checked = selectedEmployeeIds.includes(emp.id);
                                            return (
                                                <li key={emp.id}>
                                                    <button type="button" onClick={() => toggleEmployeeSelection(emp.id)} className={`flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors duration-100 hover:bg-surface-muted ${checked ? "bg-brand-softer" : ""}`}>
                                                        <Checkbox checked={checked} onChange={() => toggleEmployeeSelection(emp.id)} aria-label={`Pilih ${emp.nama}`} />
                                                        <Avatar name={emp.nama} size={28} />
                                                        <span className="min-w-0 flex-1">
                                                            <span className="block truncate text-[13px] font-medium text-txt">{emp.nama}</span>
                                                            <span className="block text-[11px] text-txt-muted">{emp.nip}</span>
                                                        </span>
                                                        <span className="font-mono text-xs text-txt-muted">{emp.no_hp}</span>
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="hidden lg:block">
                        <div className="sticky top-0">
                            <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-txt-placeholder">Pratinjau WhatsApp</div>
                            <div className="min-h-[180px] rounded-xl bg-[#ECE5DD] p-3.5">
                                {!previewMessage.trim() && !previewHasFile ? (
                                    <div className="py-10 text-center text-xs text-txt-placeholder">Tulis pesan untuk melihat pratinjau</div>
                                ) : (
                                    <div className="max-w-full rounded-t-xl rounded-bl-xl rounded-br-[2px] bg-white px-3 py-2.5 shadow-sm">
                                        {previewHasFile && (
                                            <div className={previewMessage.trim() ? "mb-2" : ""}>
                                                {previewFileKind === "image" && filePreviewUrl ? (
                                                    <img src={filePreviewUrl} alt="Pratinjau" className="max-h-[120px] w-full rounded-lg border border-surface-border object-cover" />
                                                ) : (
                                                    <div className="flex items-center gap-2 rounded-lg bg-surface-muted px-2.5 py-2">
                                                        <Icon name={previewFileKind === "pdf" ? "file" : previewFileKind === "video" ? "video" : previewFileKind === "audio" ? "audio" : "paperclip"} size={16} className="text-txt-secondary" />
                                                        <span className="truncate text-[11px] text-txt-secondary">{previewFileName}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {previewMessage.trim() && (
                                            <div className="whitespace-pre-wrap break-words text-[12.5px] leading-relaxed text-txt">{previewMessage}</div>
                                        )}
                                        <div className="mt-1 text-right font-mono text-[10px] text-txt-placeholder">
                                            {new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} ✓✓
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Confirm delete */}
            <ConfirmDialog
                open={!!deleteTarget}
                title="Hapus Jadwal"
                message="Yakin ingin menghapus jadwal ini? Tindakan ini tidak dapat dibatalkan."
                confirmLabel="Hapus"
                loading={deleting}
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    );
}
