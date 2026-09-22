import { useContext, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import API from "../services/api";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Icon from "../components/ui/Icon";
import Button from "../components/ui/Button";
import PageHeader from "../components/ui/PageHeader";
import Input from "../components/ui/Input";
import Textarea from "../components/ui/Textarea";
import Select from "../components/ui/Select";
import Checkbox from "../components/ui/Checkbox";
import Toggle from "../components/ui/Toggle";
import Tabs from "../components/ui/Tabs";
import StatCard from "../components/ui/StatCard";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import DataTable from "../components/ui/DataTable";
import Skeleton from "../components/ui/Skeleton";
import ErrorState from "../components/ui/ErrorState";
import Avatar from "../components/Avatar";
import { can } from "../utils/permissions";
import { AuthContext } from "../context/AuthContext";

function getUrgency(sisaHari) {
    if (sisaHari <= 7) return { variant: "danger", label: "Kritis" };
    if (sisaHari <= 14) return { variant: "warning", label: "Mendesak" };
    if (sisaHari <= 30) return { variant: "info", label: "Perlu Diperhatikan" };
    return { variant: "success", label: "Aman" };
}

function fillTemplate(template, emp) {
    return template.replace(/\{\{nama\}\}/g, emp.nama || "").replace(/\{\{tanggal\}\}/g, emp.tgl || "");
}

const hours = Array.from({ length: 24 }, (_, i) => i);
const minutes = Array.from({ length: 60 }, (_, i) => i);

const SIM_LABELS = { simc: "SIM C", sima: "SIM A" };

export default function SimcPage({ type = "simc" }) {
    const auth = useContext(AuthContext);
    const isOperator = can(auth.user, "operator");

    const API_BASE = `/${type}`;
    const LABEL = SIM_LABELS[type] || type.toUpperCase();

    const [activeSection, setActiveSection] = useState("settings");

    const [config, setConfig] = useState(null);
    const [configForm, setConfigForm] = useState({ days_before: 15, send_hour: 8, send_minute: 0, message_template: "", is_active: true, only_working_days: false });
    const [configLoading, setConfigLoading] = useState(true);
    const [configSaving, setConfigSaving] = useState(false);
    const [toggleSaving, setToggleSaving] = useState(false);

    const [days, setDays] = useState(15);
    const [employees, setEmployees] = useState([]);
    const [empLoading, setEmpLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [loadError, setLoadError] = useState("");
    const [selectedIds, setSelectedIds] = useState([]);
    const [message, setMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [sendResult, setSendResult] = useState(null);
    const [triggering, setTriggering] = useState(false);
    const [triggerDays, setTriggerDays] = useState(15);
    const [confirmTrigger, setConfirmTrigger] = useState(false);

    useEffect(() => {
        loadConfig();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [type]);

    async function loadConfig() {
        setConfigLoading(true);
        try {
            const res = await API.get(`${API_BASE}/config`);
            const cfg = res.data;
            if (cfg) {
                setConfig(cfg);
                setConfigForm({
                    days_before: cfg.days_before,
                    send_hour: cfg.send_hour,
                    send_minute: cfg.send_minute,
                    message_template: cfg.message_template || "",
                    is_active: !!cfg.is_active,
                    only_working_days: !!cfg.only_working_days,
                });
                setDays(cfg.days_before);
                setTriggerDays(cfg.days_before);
            }
        } catch {
            toast.error(`Gagal memuat pengaturan ${LABEL}`);
        }
        setConfigLoading(false);
    }

    async function saveConfig() {
        setConfigSaving(true);
        try {
            const res = await API.put(`${API_BASE}/config`, configForm);
            setConfig(res.data);
            setDays(res.data.days_before);
            toast.success("Pengaturan berhasil disimpan");
        } catch (err) {
            toast.error(err?.response?.data?.message || `Gagal menyimpan pengaturan ${LABEL}`);
        }
        setConfigSaving(false);
    }

    // Toggle disimpan langsung ke server (konsisten dengan halaman Pesan Terjadwal),
    // dengan optimistic update + rollback jika gagal.
    async function handleToggleChange(field, value, successMsg) {
        const prev = configForm;
        const next = { ...prev, [field]: value };
        setConfigForm(next);
        setToggleSaving(true);
        try {
            const res = await API.put(`${API_BASE}/config`, next);
            setConfig(res.data);
            toast.success(successMsg);
        } catch (err) {
            setConfigForm(prev);
            toast.error(err?.response?.data?.message || `Gagal menyimpan pengaturan ${LABEL}`);
        }
        setToggleSaving(false);
    }

    async function fetchExpiring() {
        setEmpLoading(true);
        setSearched(true);
        setLoadError("");
        setEmployees([]);
        setSelectedIds([]);
        setSendResult(null);
        try {
            const res = await API.get(`${API_BASE}/expiring?days=${days}`);
            setEmployees(res.data || []);
        } catch (err) {
            setLoadError(err?.response?.data?.message || err.message || "Gagal memuat data karyawan");
        }
        setEmpLoading(false);
    }

    function toggleSelect(nama) {
        setSelectedIds((prev) => (prev.includes(nama) ? prev.filter((n) => n !== nama) : [...prev, nama]));
    }

    function toggleSelectAll(checked) {
        if (checked) setSelectedIds(employees.map((e) => e.nama));
        else setSelectedIds([]);
    }

    const selectedEmployees = useMemo(() => employees.filter((e) => selectedIds.includes(e.nama)), [employees, selectedIds]);
    const allSelected = employees.length > 0 && selectedIds.length === employees.length;

    async function handleTestSend() {
        if (!selectedEmployees.length) {
            toast.error("Pilih minimal satu karyawan.");
            return;
        }
        if (!message.trim()) {
            toast.error("Isi pesan tidak boleh kosong.");
            return;
        }

        setSending(true);
        setSendResult(null);
        try {
            const payloadEmployees = selectedEmployees.map((e) => ({
                id: e.nama,
                nama: e.nama,
                no_hp: e.no_hp,
            }));
            const res = await API.post(`${API_BASE}/test-send`, { message, employees: payloadEmployees });
            const summary = res.data?.summary;
            setSendResult(summary || { success: 0, failed: selectedEmployees.length, total: selectedEmployees.length });
            if (summary && summary.failed === 0) {
                toast.success(`Pesan terkirim ke ${summary.success} karyawan`);
            } else if (summary) {
                toast.error(`${summary.failed} gagal dari ${summary.total}`);
            } else {
                toast.success("Pesan berhasil dikirim");
            }
        } catch (err) {
            toast.error(err?.response?.data?.message || err.message || "Gagal mengirim");
        }
        setSending(false);
    }

    async function handleTrigger() {
        setConfirmTrigger(false);
        setTriggering(true);
        try {
            await API.post(`${API_BASE}/trigger`, { days: triggerDays });
            toast.success(`Auto-send ${LABEL} berhasil di-trigger`);
            await loadConfig();
        } catch (err) {
            toast.error(err?.response?.data?.message || `Gagal trigger ${LABEL}`);
        }
        setTriggering(false);
    }

    function applyTemplate() {
        setMessage(configForm.message_template || "");
    }

    const templatePreview = useMemo(() => {
        if (!message.trim()) return "";
        if (selectedEmployees.length > 0) return fillTemplate(message, selectedEmployees[0]);
        return message;
    }, [message, selectedEmployees]);

    if (configLoading) {
        return (
            <Card className="p-6">
                <div className="space-y-4">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-24 w-full rounded-2xl" />
                    <Skeleton className="h-40 w-full rounded-2xl" />
                </div>
            </Card>
        );
    }

    return (
        <div className="space-y-5">
            <PageHeader
                title={`Pengingat ${LABEL}`}
                description={`Otomatis kirim pengingat perpanjangan ${LABEL} karyawan`}
                actions={
                    !isOperator && (
                        <span className="flex items-center gap-1.5 text-xs text-txt-muted">
                            <Icon name="lock" size={13} /> Mode hanya-lihat
                        </span>
                    )
                }
            />

            <Tabs
                ariaLabel={`Navigasi ${LABEL}`}
                items={[
                    { key: "settings", label: "Pengaturan", icon: "settings" },
                    { key: "manual", label: "Kirim Manual", icon: "send" },
                ]}
                active={activeSection}
                onChange={setActiveSection}
            />

            {/* ============ SETTINGS ============ */}
            {activeSection === "settings" && (
                <div className="space-y-4">
                    <Card className="p-5">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-txt">Status Auto-Send {LABEL}</h3>
                            <Badge variant={configForm.is_active ? "success" : "neutral"} dot>
                                {configForm.is_active ? "Aktif" : "Nonaktif"}
                            </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                            <StatCard label="Hari Sebelum" value={`${configForm.days_before} hari`} icon="clock" tone="brand" />
                            <StatCard
                                label="Jam Kirim"
                                value={`${String(configForm.send_hour).padStart(2, "0")}:${String(configForm.send_minute).padStart(2, "0")}`}
                                icon="calendar"
                                tone="info"
                            />
                            <StatCard label="Mode Kirim" value={configForm.only_working_days ? "Hari Kerja" : "Setiap Hari"} icon="calendar-days" tone="success" />
                            <StatCard
                                label="Terakhir Kirim"
                                value={
                                    config?.last_run
                                        ? new Date(config.last_run).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })
                                        : "Belum"
                                }
                                icon="refresh"
                                tone="neutral"
                            />
                        </div>

                        {/* Trigger */}
                        <div className="mt-4 flex flex-col gap-3 rounded-xl bg-surface-muted p-4 sm:flex-row sm:items-end">
                            <div className="sm:w-36">
                                <Input
                                    label="Sisa Hari (hari)"
                                    type="number"
                                    min={1}
                                    max={365}
                                    value={triggerDays}
                                    onChange={(e) => setTriggerDays(Number(e.target.value) || 1)}
                                    disabled={!isOperator || triggering}
                                />
                            </div>
                            <Button
                                icon="send"
                                loading={triggering}
                                disabled={!isOperator}
                                onClick={() => setConfirmTrigger(true)}
                                className="sm:flex-1"
                            >
                                {triggering ? "Menjalankan..." : `Trigger Manual Sekarang (${triggerDays} hari)`}
                            </Button>
                            {!isOperator && <p className="text-xs text-txt-muted sm:pb-2">Peran Anda tidak memiliki izin trigger.</p>}
                        </div>
                    </Card>

                    <Card className="p-5">
                        <h3 className="mb-4 text-sm font-bold text-txt">Pengaturan Jadwal {LABEL}</h3>

                        <div className="grid gap-4 sm:grid-cols-3">
                            <Input
                                label="Hari Sebelum Expired"
                                type="number"
                                min={1}
                                max={365}
                                value={configForm.days_before}
                                onChange={(e) => setConfigForm({ ...configForm, days_before: Number(e.target.value) || 1 })}
                                disabled={!isOperator}
                            />
                            <Select
                                label="Jam Kirim"
                                value={configForm.send_hour}
                                onChange={(e) => setConfigForm({ ...configForm, send_hour: Number(e.target.value) })}
                                options={hours.map((h) => ({ value: h, label: `${String(h).padStart(2, "0")}:00` }))}
                                disabled={!isOperator}
                            />
                            <Select
                                label="Menit Kirim"
                                value={configForm.send_minute}
                                onChange={(e) => setConfigForm({ ...configForm, send_minute: Number(e.target.value) })}
                                options={minutes.map((m) => ({ value: m, label: `:${String(m).padStart(2, "0")}` }))}
                                disabled={!isOperator}
                            />
                        </div>

                        <div className="mt-4 space-y-3">
                            <div className="flex items-center justify-between rounded-xl bg-surface-muted px-4 py-3">
                                <div>
                                    <div className="text-[13px] font-semibold text-txt">Auto-Send {LABEL} Aktif</div>
                                    <div className="text-xs text-txt-muted">Kirim otomatis setiap hari sesuai jadwal</div>
                                </div>
                                <Toggle
                                    checked={configForm.is_active}
                                    onChange={(v) => handleToggleChange("is_active", v, `Auto-Send ${LABEL} ${v ? "diaktifkan" : "dinonaktifkan"}`)}
                                    disabled={!isOperator || toggleSaving}
                                />
                            </div>
                            <div className="flex items-center justify-between rounded-xl bg-surface-muted px-4 py-3">
                                <div>
                                    <div className="text-[13px] font-semibold text-txt">Hari Kerja Saja (Senin - Jumat)</div>
                                    <div className="text-xs text-txt-muted">Hanya kirim di hari kerja, skip Sabtu/Minggu & tanggal merah</div>
                                </div>
                                <Toggle
                                    checked={configForm.only_working_days}
                                    onChange={(v) => handleToggleChange("only_working_days", v, `Mode hari kerja ${v ? "diaktifkan" : "dinonaktifkan"}`)}
                                    disabled={!isOperator || toggleSaving}
                                />
                            </div>
                        </div>

                        <div className="mt-4">
                            <Textarea
                                label={`Template Pesan ${LABEL}`}
                                rows={5}
                                placeholder={`Tulis template pesan ${LABEL}... gunakan {{nama}} dan {{tanggal}}`}
                                value={configForm.message_template}
                                onChange={(e) => setConfigForm({ ...configForm, message_template: e.target.value })}
                                disabled={!isOperator}
                                hint={
                                    <>
                                        Gunakan <code className="rounded bg-surface-muted px-1 font-mono">{"{{nama}}"}</code> untuk nama karyawan dan{" "}
                                        <code className="rounded bg-surface-muted px-1 font-mono">{"{{tanggal}}"}</code> untuk tanggal expired
                                    </>
                                }
                            />
                        </div>

                        {configForm.message_template.trim() && (
                            <div className="mt-4">
                                <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-txt-placeholder">Pratinjau WhatsApp</div>
                                <div className="rounded-xl bg-[#ECE5DD] p-3.5">
                                    <div className="max-w-[85%] rounded-t-xl rounded-bl-xl rounded-br-[2px] bg-white px-3.5 py-2.5 shadow-sm">
                                        <div className="whitespace-pre-wrap break-words text-[13.5px] leading-relaxed text-txt">
                                            {configForm.message_template.replace(/\{\{nama\}\}/g, "Budi Santoso").replace(/\{\{tanggal\}\}/g, "23-08-2026")}
                                        </div>
                                        <div className="mt-1 text-right font-mono text-[11px] text-txt-placeholder">
                                            {new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} ✓✓
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="mt-5">
                            <Button size="lg" fullWidth icon="check" loading={configSaving} disabled={!isOperator} onClick={saveConfig}>
                                {configSaving ? "Menyimpan..." : `Simpan Pengaturan ${LABEL}`}
                            </Button>
                            {!isOperator && (
                                <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-txt-muted">
                                    <Icon name="lock" size={12} /> Peran Anda hanya dapat melihat pengaturan.
                                </p>
                            )}
                        </div>
                    </Card>
                </div>
            )}

            {/* ============ MANUAL SEND ============ */}
            {activeSection === "manual" && (
                <div className="space-y-4">
                    <Card className="p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                            <div className="sm:w-40">
                                <Input
                                    label="Hari Sebelum Expired"
                                    type="number"
                                    min={1}
                                    max={365}
                                    value={days}
                                    onChange={(e) => setDays(Number(e.target.value) || 1)}
                                />
                            </div>
                            <Button icon="search" loading={empLoading} onClick={fetchExpiring} className="sm:flex-1">
                                {empLoading ? "Mencari..." : "Cari Karyawan"}
                            </Button>
                            {employees.length > 0 && <span className="pb-2.5 text-[13px] text-txt-muted">{employees.length} karyawan ditemukan</span>}
                        </div>
                    </Card>

                    {loadError && <ErrorState title="Gagal memuat data" description={loadError} onRetry={fetchExpiring} />}

                    {searched && !empLoading && !loadError && employees.length === 0 && (
                        <Card>
                            <div className="flex flex-col items-center px-6 py-12 text-center">
                                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-muted text-txt-placeholder">
                                    <Icon name="users" size={24} />
                                </div>
                                <p className="text-sm font-semibold text-txt">Tidak ada {LABEL} yang mau expired</p>
                                <p className="mt-1 text-[13px] text-txt-muted">
                                    Tidak ada karyawan dengan {LABEL} yang akan habis dalam {days} hari ke depan.
                                </p>
                            </div>
                        </Card>
                    )}

                    {employees.length > 0 && (
                        <>
                            <DataTable
                                loading={empLoading}
                                rows={employees}
                                rowKey={(e) => e.nama}
                                minWidth={760}
                                emptyTitle="Tidak ada karyawan"
                                footer={
                                    <div className="flex items-center justify-between">
                                        <span className="text-[13px] text-txt-muted">{employees.length} total</span>
                                        <span className="text-[13px] font-medium text-brand">{selectedIds.length} dipilih</span>
                                    </div>
                                }
                                columns={[
                                    {
                                        key: "check",
                                        header: (
                                            <Checkbox checked={allSelected} onChange={toggleSelectAll} aria-label="Pilih semua" />
                                        ),
                                        width: 44,
                                        render: (e) => <Checkbox checked={selectedIds.includes(e.nama)} onChange={() => toggleSelect(e.nama)} aria-label={`Pilih ${e.nama}`} />,
                                    },
                                    {
                                        key: "nama",
                                        header: "Karyawan",
                                        className: "min-w-[200px]",
                                        render: (e) => (
                                            <div className="flex items-center gap-3">
                                                <Avatar name={e.nama} size={32} />
                                                <div className="min-w-0">
                                                    <div className="truncate text-sm font-semibold text-txt">{e.nama}</div>
                                                    <div className="truncate text-xs text-txt-muted">{e.divisi || "-"}</div>
                                                </div>
                                            </div>
                                        ),
                                    },
                                    { key: "tgl", header: "Expire", render: (e) => <span className="font-mono text-[13px] text-txt-secondary">{e.tgl}</span> },
                                    {
                                        key: "sisa",
                                        header: "Sisa Hari",
                                        render: (e) => {
                                            const u = getUrgency(e.sisa_hari);
                                            return <Badge variant={u.variant}>{e.sisa_hari} hari</Badge>;
                                        },
                                    },
                                    { key: "no_hp", header: "No. HP", render: (e) => <span className="font-mono text-[13px] text-txt-secondary">{e.no_hp || "-"}</span> },
                                ]}
                            />

                            <Card className="p-5">
                                <div className="mb-3 flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-txt">Kirim Pengingat {LABEL}</h3>
                                    {isOperator && (
                                        <Button variant="brand-outline" size="sm" icon="calendar-clock" onClick={applyTemplate}>
                                            Pakai Template Auto-Send
                                        </Button>
                                    )}
                                </div>

                                <Textarea
                                    rows={6}
                                    placeholder={`Tulis pesan pengingat ${LABEL}...`}
                                    value={message}
                                    maxLength={4000}
                                    charCount={message.length}
                                    onChange={(e) => setMessage(e.target.value)}
                                    disabled={!isOperator}
                                />

                                {templatePreview && (
                                    <div className="mt-3">
                                        <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-txt-placeholder">Pratinjau</div>
                                        <div className="rounded-xl bg-[#ECE5DD] p-3.5">
                                            <div className="max-w-[85%] rounded-t-xl rounded-bl-xl rounded-br-[2px] bg-white px-3.5 py-2.5 shadow-sm">
                                                <div className="whitespace-pre-wrap break-words text-[13.5px] leading-relaxed text-txt">{templatePreview}</div>
                                                <div className="mt-1 text-right font-mono text-[11px] text-txt-placeholder">
                                                    {new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} ✓✓
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {sendResult && (
                                    <div className={`mt-3 rounded-xl border px-4 py-3 text-sm ${sendResult.failed > 0 ? "border-red-200 bg-danger-soft text-danger" : "border-green-200 bg-success-soft text-success"}`}>
                                        ✓ Berhasil: {sendResult.success} • Gagal: {sendResult.failed} • Total: {sendResult.total}
                                    </div>
                                )}

                                <div className="mt-4">
                                    <Button
                                        size="lg"
                                        fullWidth
                                        icon="send"
                                        loading={sending}
                                        disabled={!isOperator || !selectedIds.length || !message.trim()}
                                        onClick={handleTestSend}
                                    >
                                        {sending ? "Mengirim..." : `Kirim Manual ${LABEL} (${selectedIds.length})`}
                                    </Button>
                                    {!isOperator && (
                                        <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-txt-muted">
                                            <Icon name="lock" size={12} /> Peran Anda tidak memiliki izin mengirim.
                                        </p>
                                    )}
                                </div>
                            </Card>
                        </>
                    )}
                </div>
            )}

            {/* Confirm trigger */}
            <ConfirmDialog
                open={confirmTrigger}
                title={`Trigger ${LABEL}`}
                message={`Kirim pengingat ${LABEL} sekarang untuk karyawan yang ${LABEL}-nya habis dalam ${triggerDays} hari ke depan?`}
                confirmLabel="Ya, Kirim"
                tone="primary"
                loading={triggering}
                onConfirm={handleTrigger}
                onCancel={() => setConfirmTrigger(false)}
            />
        </div>
    );
}
