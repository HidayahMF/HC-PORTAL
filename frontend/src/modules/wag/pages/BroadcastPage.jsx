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
import Select from "../components/ui/Select";
import Checkbox from "../components/ui/Checkbox";
import Textarea from "../components/ui/Textarea";
import { SkeletonRows } from "../components/ui/Skeleton";
import ErrorState from "../components/ui/ErrorState";
import EmptyState from "../components/ui/EmptyState";
import { MAX_FILE_BYTES, getFileKind, isAllowedMime } from "../utils/fileUtils";
import { can } from "../utils/permissions";
import { AuthContext } from "../context/AuthContext";

const FILE_ICON = { image: "image", pdf: "file", video: "video", audio: "audio", other: "paperclip" };

function getFilePreviewIcon(kind) {
    return FILE_ICON[kind] || "paperclip";
}

export default function BroadcastPage() {
    const auth = useContext(AuthContext);
    const isOperator = can(auth.user, "operator");

    const [employees, setEmployees] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [search, setSearch] = useState("");
    const [divisiFilter, setDivisiFilter] = useState("all");
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");

    const [message, setMessage] = useState("");
    const [sending, setSending] = useState(false);

    const [job, setJob] = useState(null); // { status, total, success, failed, error }
    const [failures, setFailures] = useState([]);
    const pollRef = useRef(null);

    const [file, setFile] = useState(null);
    const [fileError, setFileError] = useState("");
    const [filePreviewUrl, setFilePreviewUrl] = useState(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (!filePreviewUrl) return undefined;
        return () => URL.revokeObjectURL(filePreviewUrl);
    }, [filePreviewUrl]);

    useEffect(() => {
        let cancelled = false;
        API.get("/broadcast/employees")
            .then((res) => {
                if (!cancelled) setEmployees(res.data || []);
            })
            .catch((err) => {
                if (!cancelled) setLoadError(err?.response?.data?.message || err.message || "Gagal memuat data karyawan");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, []);

    const selected = useMemo(() => {
        const s = new Set(selectedIds);
        return employees.filter((e) => s.has(e.id));
    }, [employees, selectedIds]);

    const divisions = useMemo(() => {
        const d = new Set();
        for (const e of employees) if (e.divisi) d.add(e.divisi);
        return Array.from(d).sort((a, b) => a.localeCompare(b));
    }, [employees]);

    const filteredEmployees = useMemo(() => {
        const q = search.trim().toLowerCase();
        return employees.filter((e) => {
            const matchSearch =
                !q ||
                String(e.nama || "").toLowerCase().includes(q) ||
                String(e.no_hp || "").toLowerCase().includes(q) ||
                String(e.nip || "").toLowerCase().includes(q);
            const matchDiv = divisiFilter === "all" || String(e.divisi || "") === divisiFilter;
            return matchSearch && matchDiv;
        });
    }, [employees, search, divisiFilter]);

    const allFilteredSelected = useMemo(() => {
        if (!filteredEmployees.length) return false;
        const s = new Set(selectedIds);
        return filteredEmployees.every((e) => s.has(e.id));
    }, [filteredEmployees, selectedIds]);

    const toggleOne = (id) => {
        setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    const toggleAllFiltered = (checked) => {
        setSelectedIds((prev) => {
            const s = new Set(prev);
            if (checked) filteredEmployees.forEach((e) => s.add(e.id));
            else filteredEmployees.forEach((e) => s.delete(e.id));
            return Array.from(s);
        });
    };

    const onPickFile = (pickedFile) => {
        setFileError("");
        if (!pickedFile) return;
        if (pickedFile.size > MAX_FILE_BYTES) {
            setFileError("Ukuran file maksimal 16MB.");
            return;
        }
        if (!isAllowedMime(pickedFile.type)) {
            setFileError("Tipe file tidak didukung. JPG/PNG/WEBP, MP4, MP3, PDF.");
            return;
        }
        if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
        const kind = getFileKind(pickedFile);
        setFilePreviewUrl(kind === "image" ? URL.createObjectURL(pickedFile) : null);
        setFile(pickedFile);
    };

    const removeFile = () => {
        setFileError("");
        if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
        setFilePreviewUrl(null);
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    // Poll status job sampai selesai.
    const pollJob = (jobId) => {
        if (pollRef.current) clearInterval(pollRef.current);
        const tick = async () => {
            try {
                const res = await API.get(`/broadcast/jobs/${jobId}`);
                const j = res.data?.job;
                if (!j) return;
                setJob({
                    id: jobId,
                    status: j.status,
                    total: j.total_count,
                    success: j.success_count,
                    failed: j.failed_count,
                    error: j.error_message,
                });
                if (j.status === "completed" || j.status === "failed") {
                    if (pollRef.current) clearInterval(pollRef.current);
                    setSending(false);
                    if (j.status === "completed") {
                        toast.success(`Broadcast selesai: ${j.success_count} terkirim, ${j.failed_count} gagal`);
                    } else {
                        toast.error(j.error_message || "Broadcast gagal diproses");
                    }
                    // Ambil detail penerima gagal.
                    try {
                        const recRes = await API.get(`/broadcast/jobs/${jobId}/recipients?page=1&limit=100`);
                        const deliveries = recRes.data?.deliveries || recRes.data?.results || [];
                        setFailures(deliveries.filter((d) => d.status === "failed"));
                    } catch {
                        setFailures([]);
                    }
                }
            } catch {
                // Polling gagal — berhenti agar tidak spinner selamanya.
                if (pollRef.current) clearInterval(pollRef.current);
                setSending(false);
            }
        };
        tick();
        pollRef.current = setInterval(tick, 2500);
    };

    const sendBroadcast = async () => {
        if (!message.trim()) {
            toast.error("Pesan tidak boleh kosong.");
            return;
        }
        if (!selected.length) {
            toast.error("Pilih minimal satu penerima.");
            return;
        }
        if (fileError) {
            toast.error(fileError);
            return;
        }

        setSending(true);
        setJob(null);
        setFailures([]);

        try {
            const payloadEmployees = selected.map((e) => ({ id: e.id, nama: e.nama, no_hp: String(e.no_hp || "").trim() }));
            let res;
            if (file) {
                const fd = new FormData();
                fd.append("message", message);
                fd.append("employees", JSON.stringify(payloadEmployees));
                fd.append("file", file);
                res = await API.post("/broadcast/send", fd, { headers: { "Content-Type": "multipart/form-data" } });
            } else {
                res = await API.post("/broadcast/send", { message, employees: payloadEmployees });
            }

            const jobId = res.data?.jobId;
            if (!jobId) throw new Error(res.data?.message || "Broadcast tidak menerima job ID");

            setJob({ id: jobId, status: "pending", total: selected.length, success: 0, failed: 0, error: "" });
            toast.success(`Broadcast dijadwalkan (${selected.length} penerima)`);
            pollJob(jobId);
        } catch (err) {
            setSending(false);
            toast.error(err?.response?.data?.message || err.message || "Gagal mengirim broadcast");
        }
    };

    const canSend = isOperator && !sending && selected.length > 0 && message.trim().length > 0 && !fileError;
    const fileKind = file ? getFileKind(file) : null;
    const isJobRunning = job && (job.status === "queued" || job.status === "running");
    const progressPct = job?.total ? Math.round(((job.success + job.failed) / job.total) * 100) : 0;

    return (
        <div className="space-y-5">
            <PageHeader
                title="Broadcast WhatsApp"
                description="Kirim pesan ke banyak karyawan sekaligus"
                actions={
                    !isOperator && (
                        <span className="flex items-center gap-1.5 text-xs text-txt-muted">
                            <Icon name="lock" size={13} /> Mode hanya-lihat
                        </span>
                    )
                }
            />

            <div className="grid items-start gap-5 xl:grid-cols-[1fr_360px]">
                {/* LEFT: recipients */}
                <div className="space-y-4">
                    <Card className="overflow-hidden">
                        <div className="border-b border-surface-divider bg-surface-muted px-4 py-3">
                            <div className="mb-3 flex flex-col gap-2 sm:flex-row">
                                <Input
                                    icon="search"
                                    placeholder="Cari nama, NIP, atau No. HP"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    aria-label="Cari karyawan"
                                />
                                <Select
                                    value={divisiFilter}
                                    onChange={(e) => setDivisiFilter(e.target.value)}
                                    options={[{ value: "all", label: "Semua Divisi" }, ...divisions.map((d) => ({ value: d, label: d }))]}
                                    className="sm:w-56"
                                    aria-label="Filter divisi"
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <Checkbox checked={allFilteredSelected} onChange={toggleAllFiltered} label={`Pilih semua (${filteredEmployees.length})`} />
                                <span className="text-[13px] font-medium text-brand">{selectedIds.length} dipilih</span>
                            </div>
                        </div>

                        <div className="max-h-[520px] overflow-y-auto">
                            {loading ? (
                                <div className="px-5 py-6">
                                    <SkeletonRows rows={6} />
                                </div>
                            ) : loadError ? (
                                <ErrorState title="Gagal memuat karyawan" description={loadError} />
                            ) : filteredEmployees.length === 0 ? (
                                <EmptyState icon="users" title="Tidak ada karyawan ditemukan" description="Coba ubah kata kunci atau filter divisi." />
                            ) : (
                                <ul className="divide-y divide-surface-divider">
                                    {filteredEmployees.map((emp) => {
                                        const isChecked = selectedIds.includes(emp.id);
                                        return (
                                            <li key={emp.id}>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleOne(emp.id)}
                                                    aria-pressed={isChecked}
                                                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-100 hover:bg-surface-muted ${isChecked ? "bg-brand-softer" : ""}`}
                                                >
                                                    <Checkbox checked={isChecked} onChange={() => toggleOne(emp.id)} aria-label={`Pilih ${emp.nama}`} />
                                                    <Avatar name={emp.nama} size={34} />
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block truncate text-sm font-semibold text-txt">{emp.nama}</span>
                                                        {emp.divisi && <span className="block truncate text-xs text-txt-muted">{emp.divisi}</span>}
                                                    </span>
                                                    <span className="hidden font-mono text-[13px] text-txt-secondary sm:block">{emp.no_hp}</span>
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    </Card>

                    {/* Daftar penerima terpilih */}
                    {selected.length > 0 && (
                        <Card className="overflow-hidden">
                            <div className="border-b border-surface-divider bg-surface-muted px-4 py-2.5 text-[13px] font-semibold text-txt">
                                Penerima terpilih ({selected.length})
                            </div>
                            <div className="max-h-56 overflow-y-auto p-3">
                                <div className="flex flex-wrap gap-2">
                                    {selected.map((e) => (
                                        <span key={e.id} className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft py-1 pl-1.5 pr-2 text-xs font-medium text-brand">
                                            <Avatar name={e.nama} size={20} />
                                            {e.nama}
                                            <button
                                                type="button"
                                                onClick={() => toggleOne(e.id)}
                                                aria-label={`Hapus ${e.nama} dari penerima`}
                                                className="rounded-full p-0.5 text-brand/70 transition-colors hover:bg-brand/15 hover:text-brand"
                                            >
                                                <Icon name="x" size={12} strokeWidth={2.5} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </Card>
                    )}
                </div>

                {/* RIGHT: composer */}
                <div className="space-y-4">
                    <Card className="p-5">
                        <Textarea
                            label="Isi Pesan"
                            rows={7}
                            placeholder="Tulis pesan broadcast Anda di sini..."
                            value={message}
                            maxLength={4000}
                            charCount={message.length}
                            onChange={(e) => setMessage(e.target.value)}
                        />

                        {/* Attachment */}
                        <div className="mt-4">
                            <div className="mb-2 flex items-center justify-between gap-3">
                                <div>
                                    <div className="text-xs font-semibold uppercase tracking-widest text-txt-secondary">Lampiran (opsional)</div>
                                    <div className="mt-0.5 text-xs text-txt-muted">Max 16MB • JPG/PNG/WEBP, MP4, MP3, PDF</div>
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,video/mp4,audio/mpeg,application/pdf"
                                    className="hidden"
                                    onChange={(e) => onPickFile(e.target.files?.[0])}
                                />
                                <Button variant="secondary" size="sm" icon="paperclip" onClick={() => fileInputRef.current?.click()} disabled={sending}>
                                    Pilih File
                                </Button>
                            </div>

                            {fileError && (
                                <div className="mb-2 rounded-lg border border-red-200 bg-danger-soft px-3 py-2 text-xs font-semibold text-danger">{fileError}</div>
                            )}

                            {file && (
                                <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-muted p-3">
                                    <div className="flex min-w-0 items-center gap-3">
                                        {fileKind === "image" && filePreviewUrl ? (
                                            <img src={filePreviewUrl} alt="Pratinjau lampiran" className="h-12 w-12 rounded-lg border border-surface-border object-cover" />
                                        ) : (
                                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white text-txt-secondary">
                                                <Icon name={getFilePreviewIcon(fileKind)} size={22} />
                                            </span>
                                        )}
                                        <div className="min-w-0">
                                            <div className="truncate text-[13px] font-bold text-txt">{file.name}</div>
                                            <div className="text-xs text-txt-muted">{(file.size / (1024 * 1024)).toFixed(2)} MB</div>
                                        </div>
                                    </div>
                                    <IconButton icon="trash" label="Hapus lampiran" variant="danger" onClick={removeFile} disabled={sending} />
                                </div>
                            )}
                        </div>

                        {/* WhatsApp preview */}
                        {message.trim() && (
                            <div className="mt-4">
                                <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-txt-placeholder">Pratinjau WhatsApp</div>
                                <div className="rounded-xl bg-[#ECE5DD] p-3.5">
                                    <div className="max-w-[85%] rounded-t-xl rounded-bl-xl rounded-br-[2px] bg-white px-3.5 py-2.5 shadow-sm">
                                        <div className="whitespace-pre-wrap break-words text-[13.5px] leading-relaxed text-txt">{message}</div>
                                        <div className="mt-1 text-right font-mono text-[11px] text-txt-placeholder">
                                            {new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} ✓✓
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </Card>

                    {/* Send + progress */}
                    <Card className="p-5">
                        <div className="mb-4 grid grid-cols-2 gap-2.5">
                            <div className="rounded-xl bg-brand-soft p-3.5 text-brand">
                                <div className="text-2xl font-bold">{selectedIds.length}</div>
                                <div className="text-xs opacity-80">Dipilih</div>
                            </div>
                            <div className="rounded-xl bg-surface-muted p-3.5 text-txt-secondary">
                                <div className="text-2xl font-bold">{employees.length}</div>
                                <div className="text-xs opacity-80">Total</div>
                            </div>
                        </div>

                        {isJobRunning && (
                            <div className="mb-4">
                                <div className="mb-1.5 flex items-center justify-between text-xs">
                                    <span className="font-semibold text-txt">Mengirim... {job.success + job.failed} / {job.total}</span>
                                    <span className="text-txt-muted">{progressPct}%</span>
                                </div>
                                <div className="h-2 overflow-hidden rounded-full bg-surface-muted" role="progressbar" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100}>
                                    <div className="h-full rounded-full bg-brand transition-all duration-300" style={{ width: `${progressPct}%` }} />
                                </div>
                            </div>
                        )}

                        {job && !isJobRunning && (
                            <div className="mb-4 rounded-xl border border-surface-divider bg-surface-muted p-3.5">
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant={job.status === "completed" ? "success" : "danger"}>
                                        {job.status === "completed" ? "Selesai" : "Gagal"}
                                    </Badge>
                                    <span className="text-[13px] text-txt-secondary">
                                        <span className="font-semibold text-success">✓ {job.success}</span>
                                        {job.failed > 0 && <span className="font-semibold text-danger"> • ✕ {job.failed}</span>} dari {job.total} penerima
                                    </span>
                                </div>
                                {failures.length > 0 && (
                                    <div className="mt-3">
                                        <div className="mb-1.5 text-xs font-semibold text-danger">Detail penerima gagal:</div>
                                        <ul className="max-h-40 space-y-1 overflow-y-auto">
                                            {failures.slice(0, 20).map((d, i) => (
                                                <li key={i} className="flex items-start gap-2 text-xs">
                                                    <Icon name="alert-circle" size={13} className="mt-0.5 shrink-0 text-danger" />                    <span className="min-w-0 text-txt-secondary">
                        <span className="font-medium">{d.recipient_name || d.nama || d.phone}</span>
                        {d.error_message || d.error ? <span className="text-txt-muted"> — {d.error_message || d.error}</span> : null}
                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                        {failures.length > 20 && <div className="mt-1 text-xs text-txt-muted">+{failures.length - 20} lainnya</div>}
                                    </div>
                                )}
                            </div>
                        )}

                        <Button size="lg" fullWidth icon="send" loading={sending} disabled={!isOperator || sending} onClick={sendBroadcast}>
                            {sending ? "Mengirim..." : `Kirim Broadcast${selectedIds.length ? ` (${selectedIds.length})` : ""}`}
                        </Button>

                        {!isOperator && (
                            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-txt-muted">
                                <Icon name="lock" size={12} /> Peran Anda hanya dapat melihat. Hubungi operator untuk mengirim.
                            </p>
                        )}
                        {isOperator && !sending && !canSend && !job && (
                            <p className="mt-3 text-center text-xs text-txt-muted">
                                {!selected.length ? "Pilih penerima terlebih dahulu." : "Tulis pesan terlebih dahulu."}
                            </p>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
}
